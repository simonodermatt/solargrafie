import re

with open('style.css', 'r') as f:
    css_content = f.read()

# Make admin-wrapper proper fullscreen flex container
css_content = re.sub(
    r'\.admin-wrapper \{.*?\n\}',
    '.admin-wrapper {\n  display: flex;\n  height: 100vh;\n  width: 100vw;\n  overflow: hidden;\n  background-color: var(--color-bg);\n}',
    css_content,
    flags=re.DOTALL
)

# Admin Sidebar (Desktop)
sidebar_css = """
/* Sidebar (Desktop) / Navigation Container */
.admin-sidebar {
  width: 280px;
  background: rgba(15, 23, 42, 0.85);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 100;
}

.admin-nav-tabs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.admin-nav-tabs .btn {
  width: 100%;
  justify-content: flex-start;
}

.admin-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 30px;
  position: relative;
}
"""

css_content = re.sub(
    r'/\* Sidebar \(Desktop\) \*/\n\.admin-sidebar \{.*?\n\}',
    sidebar_css.strip(),
    css_content,
    flags=re.DOTALL
)

# Mobile styling adjustments
mobile_css = """
  .admin-wrapper {
    flex-direction: column;
  }

  .admin-sidebar {
    width: 100%;
    position: fixed;
    bottom: 0;
    left: 0;
    height: 64px;
    flex-direction: row;
    padding: 0 10px;
    border-right: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.95);
    z-index: 300;
    justify-content: space-around;
    align-items: center;
  }

  .sidebar-logo {
    display: none !important;
  }

  .admin-nav-tabs {
    flex-direction: row;
    justify-content: space-around;
    gap: 0;
  }

  .admin-nav-tabs .btn {
    width: auto;
    padding: 8px 12px;
    font-size: 0.8rem;
    border: none;
    background: transparent;
    flex-direction: column;
    gap: 4px;
    border-radius: 8px;
  }

  .admin-nav-tabs .btn.btn-secondary {
    border: none;
  }

  .admin-nav-tabs .btn.btn {
    background: rgba(14, 165, 233, 0.15);
  }

  .admin-main-content {
    padding: 20px;
    padding-bottom: 84px; /* Space for bottom nav */
  }
"""

css_content = re.sub(
    r'\.admin-wrapper \{\n    flex-direction: column;\n  \}\n\n  \.admin-sidebar \{\n    display: none; /\* hide sidebar on mobile \*/\n  \}',
    mobile_css.strip(),
    css_content,
    flags=re.DOTALL
)

with open('style.css', 'w') as f:
    f.write(css_content)

print("CSS updated successfully.")
