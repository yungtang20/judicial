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
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({
                        "documentTitle": "民事起訴狀",
                        "documentText": "依民法第184條請求損害賠償。",
                        "pleadingDeliveryAuthorization": {
                            "finalGateStatus": "READY",
                            "exportPolicy": "READY_ONLY",
                            "evaluatorVersion": "e2e",
                            "gateInputFingerprint": "a" * 64,
                            "documentFingerprint": "b" * 64,
                            "caseInputId": "case-e2e",
                            "draftId": "draft-e2e",
                            "ruleProfileId": "profile-e2e",
                            "ruleProfileVersion": "1",
                            "authorizedActions": ["DOWNLOAD_TEXT"],
                        },
                    }))
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

            with page.expect_download(timeout=15000) as download_info:
                page.get_by_role("button", name="CIVIL_COMPLAINT_GENERAL").click()
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
