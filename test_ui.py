import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('http://127.0.0.1:8080/admin.html')
    time.sleep(1)

    # We can't really login easily, but we can unhide the dashboard using JS to test the UI layout
    page.evaluate('''
        document.getElementById('loading-container').classList.add('hidden');
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('auth-card').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');
        document.getElementById('tab-solargrafien').classList.remove('hidden');
    ''')

    time.sleep(1)
    # Check if tabs exist
    tabs = page.locator('.admin-nav-tabs .btn')
    count = tabs.count()
    print(f"Number of tabs: {count}")

    page.click('#tab-btn-translations')
    time.sleep(0.5)
    translations_visible = page.locator('#tab-translations').is_visible()
    print(f"Translations tab visible: {translations_visible}")

    page.click('#tab-btn-users')
    time.sleep(0.5)
    users_visible = page.locator('#tab-users').is_visible()
    print(f"Users tab visible: {users_visible}")

    browser.close()
