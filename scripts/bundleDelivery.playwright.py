import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PORT = "4173"
BASE_URL = f"http://127.0.0.1:{PORT}"


def main() -> None:
    env = os.environ.copy()
    env.update({"PORT": PORT, "NODE_ENV": "development", "REQUIRE_AUTH": "false"})
    server = subprocess.Popen(["npm.cmd", "run", "dev"], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(60):
            try:
                urllib.request.urlopen(BASE_URL, timeout=1).close()
                break
            except OSError:
                time.sleep(1)
        else:
            raise RuntimeError("development server did not start")
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(accept_downloads=True)
            requests = []
            allow_p9 = True
            responses = []

            def observe_response(response):
                if response.url.endswith('/api/toolbox/generate'):
                    responses.append((response.status, response.text()))

            page.on('response', observe_response)

            def route_api(route):
                nonlocal allow_p9
                request = route.request
                if request.url.endswith("/api/triage/universal"):
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({
                        "recommendedToolId": "CIVIL_COMPLAINT_GENERAL",
                        "pleadingDraft": "依民法第184條請求損害賠償。",
                        "legalBasis": ["民法第184條"],
                        "plainExplanation": "已完成案情整理。",
                        "evidenceChecklist": ["對話紀錄"],
                        "generationParams": {
                            "courtName": "臺灣臺中地方法院",
                            "plaintiffName": "甲○○",
                            "plaintiffAddress": "臺中市測試區原告路1號",
                            "defendantName": "乙○○",
                            "defendantAddress": "臺中市測試區被告路2號",
                            "proceeding": "返還借款事件",
                            "claimStatement": "被告應給付原告新臺幣100,000元。",
                            "facts": "原告交付借款後，被告於清償期屆至仍未返還。",
                            "evidenceDetails": "原證一：匯款紀錄",
                            "documentDate": "民國115年9月13日",
                            "signature": "甲○○"
                        }
                    }))
                    return
                if request.url.endswith("/api/toolbox/generate"):
                    payload = request.post_data_json
                    requests.append(payload)
                    if not allow_p9:
                        route.fulfill(status=200, content_type="application/json", body=json.dumps({
                            "documentTitle": "blocked",
                            "documentText": "依民法第184條請求。",
                        }))
                        return
                    route.continue_()
                    return
                route.continue_()

            page.route("**/api/**", route_api)
            page.goto(BASE_URL, wait_until="domcontentloaded")
            page.get_by_role("button", name="全方位實用法務工具箱").click()
            page.wait_for_timeout(1000)
            page.locator("nav button").filter(has_text="生活法律導診").click(force=True)
            page.wait_for_timeout(1000)
            expect(page.get_by_text("描述你遇到的狀況")).to_be_visible(timeout=60000)
            page.locator("#legal-situation").fill("房客積欠三個月租金，我想終止租約並請他搬離")
            page.get_by_role("button", name="開始分析").click()
            expect(page.get_by_text("CIVIL_COMPLAINT_GENERAL")).to_be_visible(timeout=15000)

            try:
                with page.expect_download(timeout=15000) as download_info:
                    page.get_by_role("button", name="CIVIL_COMPLAINT_GENERAL").click()
            except Exception:
                print({"requests": requests, "responses": responses})
                raise
            download = download_info.value
            assert download.suggested_filename.endswith(".txt")
            assert requests[-1]["toolCategory"] == "CIVIL_COMPLAINT_GENERAL"
            assert requests[-1]["params"]["incidentDetails"].startswith("房客積欠三個月租金")

            allow_p9 = False
            page.get_by_role("button", name="CIVIL_COMPLAINT_GENERAL").click()
            expect(page.get_by_role("alert")).to_contain_text("P9_FINAL_GATE_REQUIRED")
            browser.close()
    finally:
        subprocess.run(["taskkill", "/PID", str(server.pid), "/T", "/F"], capture_output=True, check=False)


if __name__ == "__main__":
    main()
