import base64
import os
import sys

from playwright.sync_api import sync_playwright


def generate_pdf(html_content, output_path):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        # Encode HTML content as base64 data URL
        html_base64 = base64.b64encode(html_content.encode('utf-8')).decode('utf-8')
        data_url = f"data:text/html;base64,{html_base64}"
        
        page.goto(data_url, wait_until='networkidle')
        
        page.evaluate('''() => {
            const resume = document.querySelector('.resume-container');
            if (resume) {
                resume.style.padding = '0';
                resume.style.margin = '0';
                resume.style.border = 'none';
            }
            document.body.style.padding = '0';
            document.body.style.margin = '0';
        }''')
        
        page.pdf(
            path=output_path,
            format='A4',
            margin={'top': '20px', 'right': '30px', 'bottom': '20px', 'left': '30px'},
            print_background=True,
            scale=0.95
        )
        
        browser.close()

if __name__ == "__main__":
    html_path = sys.argv[1]
    output_path = sys.argv[2]
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    generate_pdf(html_content, output_path)