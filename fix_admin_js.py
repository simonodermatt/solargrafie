with open('admin.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for idx, line in enumerate(lines):
    if idx == 130 and "const tabBtnSolargrafien =" in line:
        pass # remove duplicate
    elif idx >= 130 and idx <= 135 and "const tab" in line and "document.getElementById" in line:
        pass # remove the other duplicates in that block
    else:
        new_lines.append(line)

with open('admin.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
