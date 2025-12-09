"""
Async load tester for Smart Shopping List.
- Ramps through stages of increasing concurrency.
- Auths once, reuses token, and calls core endpoints with weighted selection.
- Prints per-endpoint latency stats and error counts.
Optional: install httpx[http2] and matplotlib for faster IO/plots.
"""

import asyncio, os, random, statistics, string, time
from collections import defaultdict
import httpx
import matplotlib.pyplot as plt


USER_BASE = os.getenv("USER_SERVICE_URL", "http://localhost:8001")
LIST_BASE = os.getenv("LIST_SERVICE_URL", "http://localhost:8002")
INV_BASE = os.getenv("INVENTORY_SERVICE_URL", "http://localhost:8003")
REC_BASE = os.getenv("RECOMMENDER_SERVICE_URL", "http://localhost:8005")
# load stages: (name, concurrency, total_requests)
STAGES = [("warmup", 15, 200), ("medium", 30, 400), ("heavy", 60, 800)]
SERVICE_MAP = {
    "me": "user",
    "lists": "list",
    "list_detail": "list",
    "add_item": "list",
    "inventory": "inventory",
    "recommend": "recommender",
}

def rand_email():
    s = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"lt_{s}@example.com"

async def setup_auth(client):
    email, password = rand_email(), "LoadTest123!"
    await client.post(f"{USER_BASE}/auth/register", json={"email": email, "password": password, "display_name": "Load Bot"})
    res = await client.post(f"{USER_BASE}/auth/login", data={"username": email, "password": password})
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    lst = await client.post(f"{LIST_BASE}/lists", headers=headers, json={"name": "Load List", "description": "auto"})
    list_id = lst.json()["id"]
    return headers, list_id, email

def endpoints(headers, list_id, user_id):
    sample_items = ["milk", "bread", "eggs", "coffee", "bananas", "apples"]
    return [
        ("me", "GET", f"{USER_BASE}/users/me", headers, None),
        ("lists", "GET", f"{LIST_BASE}/lists", headers, None),
        ("list_detail", "GET", f"{LIST_BASE}/lists/{list_id}", headers, None),
        ("add_item", "POST", f"{LIST_BASE}/lists/{list_id}/items", headers,
         lambda: {"item_id": random.choice(sample_items), "quantity": random.randint(1, 3)}),
        ("inventory", "GET", f"{INV_BASE}/items?text={random.choice(['a','br','co','eg'])}", None, None),
        ("recommend", "POST", f"{REC_BASE}/recommendations", None,
         lambda: {"user_id": user_id, "list_id": list_id, "current_items": random.sample(sample_items, k=3)}),
    ], [2, 2, 2, 2, 2, 1]  # weights

async def shoot(client, ep):
    name, method, url, headers, body_fn = ep
    data = body_fn() if body_fn else None
    start = time.perf_counter()
    try:
        resp = await client.request(method, url, headers=headers, json=data, timeout=10.0)
        latency = (time.perf_counter() - start) * 1000
        return name, resp.status_code, latency
    except Exception:
        latency = (time.perf_counter() - start) * 1000
        return name, None, latency

async def run_stage(client, stage, eps, weights):
    name, conc, total = stage
    sem = asyncio.Semaphore(conc)
    results = []
    async def worker():
        async with sem:
            ep = random.choices(eps, weights=weights, k=1)[0]
            ep_name, status, latency = await shoot(client, ep)
            results.append((name, ep_name, status, latency))
    tasks = [asyncio.create_task(worker()) for _ in range(total)]
    t0 = time.perf_counter()
    await asyncio.gather(*tasks)
    return results, time.perf_counter() - t0

def summarize(all_results):
    per_ep = defaultdict(list)
    per_service = defaultdict(list)
    per_stage_service = defaultdict(lambda: defaultdict(list))
    errors = defaultdict(int)
    for stage, name, status, lat in all_results:
        per_ep[name].append(lat)
        svc = SERVICE_MAP.get(name, "unknown")
        per_service[svc].append(lat)
        per_stage_service[stage][svc].append(lat)
        if status is None or status >= 400:
            errors[name] += 1
    print("\nLatency by endpoint (ms):")
    rows = []
    for name in sorted(per_ep):
        vals = per_ep[name]
        rows.append((name, len(vals), errors.get(name, 0),
                     f"{statistics.median(vals):.1f}",
                     f"{statistics.quantiles(vals, n=100)[94]:.1f}" if len(vals) >= 2 else f"{max(vals):.1f}",
                     f"{max(vals):.1f}"))
    colw = [max(len(str(x)) for x in col) for col in zip(*([("endpoint","count","errors","p50","p95","max")]+rows))]
    def fmt(r): return " | ".join(str(v).ljust(w) for v, w in zip(r, colw))
    print(fmt(("endpoint","count","errors","p50","p95","max"))); print("-+-".join("-"*w for w in colw))
    for r in rows: print(fmt(r))
    print("\nLatency by service (ms):")
    svc_rows = []
    for svc in sorted(per_service):
        vals = per_service[svc]
        svc_rows.append((svc, len(vals),
                         f"{statistics.median(vals):.1f}",
                         f"{statistics.quantiles(vals, n=100)[94]:.1f}" if len(vals) >= 2 else f"{max(vals):.1f}",
                         f"{max(vals):.1f}"))
    svc_colw = [max(len(str(x)) for x in col) for col in zip(*([("service","count","p50","p95","max")]+svc_rows))]
    def svc_fmt(r): return " | ".join(str(v).ljust(w) for v, w in zip(r, svc_colw))
    print(svc_fmt(("service","count","p50","p95","max"))); print("-+-".join("-"*w for w in svc_colw))
    for r in svc_rows: print(svc_fmt(r))
    return per_ep, per_service, per_stage_service

def plot_grouped(per_stage_service, stage_order, stage_meta):
    if plt is None:
        print("\nmatplotlib not installed; skipping plots.")
        return
    os.makedirs("plots", exist_ok=True)
    services = sorted({svc for stage_data in per_stage_service.values() for svc in stage_data})
    if not services or not stage_order:
        return
    x = list(range(len(services)))
    width = 0.8 / max(len(stage_order), 1)
    plt.figure(figsize=(10, 5))
    for idx, stage in enumerate(stage_order):
        avgs = []
        stage_data = per_stage_service.get(stage, {})
        for svc in services:
            vals = stage_data.get(svc, [])
            avgs.append(sum(vals)/len(vals) if vals else 0)
        offset = [p + (idx - (len(stage_order)-1)/2) * width for p in x]
        conc, total = stage_meta.get(stage, (None, None))
        label_suffix = []
        if conc is not None:
            label_suffix.append(f"c={conc}")
        if total is not None:
            label_suffix.append(f"req={total}")
        label = f"{stage} ({', '.join(label_suffix)})" if label_suffix else stage
        plt.bar(offset, avgs, width=width, label=label)
    plt.xticks(x, services, rotation=20, ha="right")
    plt.ylabel("Average latency (ms)")
    plt.xlabel("Service")
    plt.title("Avg latency per service by load stage")
    plt.legend()
    plt.tight_layout()
    plt.savefig("plots/service_latency_by_stage.png")
    plt.close()

async def main():
    async with httpx.AsyncClient() as client:
        headers, list_id, user_id = await setup_auth(client)
        eps, weights = endpoints(headers, list_id, user_id)
        all_results = []
        total_time = 0.0
        for stage in STAGES:
            print(f"Stage {stage[0]}: concurrency={stage[1]}, requests={stage[2]}")
            res, dur = await run_stage(client, stage, eps, weights)
            all_results.extend(res); total_time += dur
            print(f"  done in {dur:.2f}s")
        per_ep, per_service, per_stage_service = summarize(all_results)
        rps = len(all_results)/total_time if total_time else 0
        print(f"\nOverall: {len(all_results)} requests in {total_time:.2f}s ({rps:.1f} req/s)")
        stage_order = [s[0] for s in STAGES]
        stage_meta = {s[0]: (s[1], s[2]) for s in STAGES}
        plot_grouped(per_stage_service, stage_order, stage_meta)

if __name__ == "__main__":
    asyncio.run(main())
