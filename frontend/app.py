import calendar
from datetime import datetime
from pathlib import Path

import requests
import streamlit as st
from bson.objectid import ObjectId
from pymongo import MongoClient


# Wake up the backend server
@st.cache_resource
def wake_backend():
    try:
        api_url = st.secrets["backend"]["url"] + "/wake"
        response = requests.get(api_url, timeout=3)
    except Exception:
        pass

wake_backend()
    
# MongoDB connection
@st.cache_resource
def init_connection():
    return MongoClient(st.secrets["mongo"]["uri"])

client = init_connection()
db = client.buildit  # This connects to your 'buildit' database
resumes = db.resumes  # This uses your 'resumes' collection

# Resume template (based on your HTML)
RESUME_TEMPLATE = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{name} - {title} Resume</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.3;
                color: #000;
                background: #fff;
                padding: 0;
                margin: 0;
            }}
            /* Dark mode support for Streamlit preview */
            @media (prefers-color-scheme: dark) {{
                body {{
                    color: #eee;
                    background: #222;
                }}
                .resume-container {{
                    background: #222;
                    color: #eee;
                }}
                a {{
                    color: #8ab4f8;
                }}
                .section-title, h1, h2 {{
                    border-color: #444;
                }}
            }}

            .resume-container {{
                max-width: 800px;
                margin: auto;
                padding: 25px;
                border: none;
            }}

            h1, h2 {{
                text-align: {name_alignment};
                margin-bottom: 5px;
            }}

            h1 {{
                font-size: 24px;
                font-weight: {name_weight};
            }}

            h2 {{
                font-size: 16px;
                font-weight: normal;
            }}

            .section-title {{
                font-weight: bold;
                margin-top: 20px;
                border-bottom: 1px solid #000;
                padding-bottom: 3px;
                text-align: {section_title_alignment};
            }}

            ul {{
                margin: 0;
                padding-left: 20px;
            }}

            p {{
                margin: 6px 0;
                text-align: {paragraph_alignment};
            }}

            .contact {{
                text-align: center;
                font-size: 14px;
            }}

            .skills, .certifications {{
                padding-top: 10px;
            }}

            a {{
                color: #000;
                text-decoration: none;
            }}

            @media print {{
                body {{
                    padding: 0;
                    margin: 0;
                }}

                .resume-container {{
                    padding: 20px;
                    max-width: 100%;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="resume-container">
            <h1>{name}</h1>
            <h2>{title}</h2>
            <div class="contact">
                {contact_info}
            </div>

            {sections}
        </div>
    </body>
    </html>
    """

SECTION_TEMPLATES = {
    "paragraph": "<div class='section-title'>{title}</div><p>{content}</p>",
    "bullet_points": "<div class='section-title'>{title}</div><ul>{items}</ul>",
    "experience": """
        <div class='section-title'>{title}</div>
        {items}
    """,
    "experience_item": """
        <p><strong>{position}</strong>, {company} <span style='float:right;'>{date_range}</span></p>
        <ul>{bullet_points}</ul>
    """
}

def get_section_content(section_type, section_data):
    title_style = (
        f"text-align:{section_data['title_formatting'].get('alignment', 'left')};"
        f"font-size:{section_data['title_formatting'].get('font_size', 16)}px;"
        f"font-weight:{section_data['title_formatting'].get('font_weight', 'bold')};"
    )
    content_style = (
        f"text-align:{section_data['content_formatting'].get('alignment', 'left')};"
        f"font-size:{section_data['content_formatting'].get('font_size', 14)}px;"
        f"font-weight:{section_data['content_formatting'].get('font_weight', 'normal')};"
    )
    if section_type == "paragraph":
        return (
            f"<div class='section-title' style='{title_style}'>{section_data['title']}</div>"
            f"<p style='{content_style}'>{section_data['content']}</p>"
        )
    elif section_type == "bullet_points":
        items = "".join(f"<li style='{content_style}'>{item}</li>" for item in section_data["items"])
        return (
            f"<div class='section-title' style='{title_style}'>{section_data['title']}</div>"
            f"<ul>{items}</ul>"
        )
    elif section_type == "experience":
        items = ""
        for exp in section_data["items"]:
            bullets = "".join(
                f'<li style="{content_style}">{bullet}</li>' for bullet in exp["bullet_points"]
            )
            items += (
                f'<p style="{content_style}"><strong>{exp["position"]}</strong>, {exp["company"]} '
                f'<span style="float:right;">{exp["date_range"]}</span></p>'
                f"<ul>{bullets}</ul>"
            )
        return f'<div class="section-title" style="{title_style}">{section_data["title"]}</div>{items}'
    return ""

def load_resume(email):
    resume = resumes.find_one({"email": email})
    if resume:
        return resume
    return None

def save_resume(email, resume_data):
    resume_data = dict(resume_data)  # Make a copy to avoid mutating session state
    resume_data["last_updated"] = datetime.now()
    resume_data["email"] = email  # Ensure email is always present
    if "_id" in resume_data:
        del resume_data["_id"]  # Remove MongoDB's _id field before upsert
    resumes.update_one(
        {"email": email},         # Use email as the unique key
        {"$set": resume_data},    # Set all fields from resume_data
        upsert=True               # Insert if not exists, update if exists
    )

def main():
    st.title("Professional Resume Builder")
    st.write("Create an ATS-friendly resume with your preferred formatting")

    # Initialize session state
    if 'resume_data' not in st.session_state:
        st.session_state.resume_data = {
            "name": "Full Name",
            "title": "Professional Title",
            "contact_info": "City, Country | Phone | email@example.com | linkedin.com/in/your-profile | github.com/yourusername",
            "sections": [],
            "formatting": {
                "name_alignment": "center",
                "name_weight": "bold",
                "section_title_alignment": "center",
                "paragraph_alignment": "left"
            },
            "pdf_settings": {
                "margins": {"top": "20mm", "right": "20mm", "bottom": "20mm", "left": "20mm"},
                "scale": 1.0,
                "page_size": "A4",
                "zoom": 1.0,
                "spacing": 1.3
            }
        }

    # Load existing resume
    with st.expander("Load Existing Resume"):
        email_to_load = st.text_input("Enter your email to load your resume")
        if st.button("Load Resume") and email_to_load:
            existing_resume = load_resume(email_to_load)
            if existing_resume:
                st.session_state.resume_data = existing_resume
                st.success("Resume loaded successfully!")
            else:
                st.warning("No resume found for this email")

    # Upload & Autofill from Existing Resume
    st.header("Upload & Autofill from Existing Resume")
    uploaded_file = st.file_uploader("Upload your resume (PDF or DOCX)", type=["pdf", "docx"])
    if uploaded_file:
        with st.spinner("Parsing your resume..."):
            api_url = st.secrets["backend"]["url"] + "/parse-resume-ai"
            files = {"file": (uploaded_file.name, uploaded_file.getvalue())}
            response = requests.post(api_url, files=files)
            print(response.status_code, response.text)
            if response.status_code == 200:
                parsed = response.json()
                # --- Autofill logic ---
                # Basic info
                st.session_state.resume_data["name"] = parsed.get("name", "")
                st.session_state.resume_data["contact_info"] = " | ".join(
                    filter(None, [parsed.get("email", ""), parsed.get("phone", "")])
                )
                # Skills section (if you have one)
                for section in st.session_state.resume_data["sections"]:
                    if section["type"] == "bullet_points" and "skills" in section.get("title", "").lower():
                        section["items"] = parsed.get("skills", [])
                # Education section
                for section in st.session_state.resume_data["sections"]:
                    if section["type"] == "paragraph" and "education" in section.get("title", "").lower():
                        edu_str = "\n".join(
                            f"{e.get('degree', '')}, {e.get('institution', '')} ({e.get('dates', '')}) {e.get('details', '')}"
                            for e in parsed.get("education", [])
                        )
                        section["content"] = edu_str
                # Experience section
                for section in st.session_state.resume_data["sections"]:
                    if section["type"] == "experience":
                        section["items"] = []
                        for exp in parsed.get("experience", []):
                            section["items"].append({
                                "position": exp.get("position", ""),
                                "company": exp.get("company", ""),
                                "date_range": exp.get("date_range", ""),
                                "bullet_points": exp.get("bullet_points", []),
                                "formatting": {
                                    "alignment": "left",
                                    "font_size": 14,
                                    "font_weight": "normal"
                                }
                            })
                # Optionally, handle summary
                if parsed.get("summary"):
                    st.session_state.resume_data["summary"] = parsed["summary"]
                st.success("Resume parsed and autofilled! Please review and edit as needed.")
            else:
                st.error("Failed to parse resume. Please check your file format.")

    # Basic Info
    st.header("Basic Information")
    col1, col2 = st.columns(2)
    with col1:
        st.session_state.resume_data["name"] = st.text_input("Full Name", st.session_state.resume_data["name"])
    with col2:
        st.session_state.resume_data["title"] = st.text_input("Professional Title", st.session_state.resume_data["title"])
    
    st.session_state.resume_data["contact_info"] = st.text_area(
        "Contact Information (separate items with '|')", 
        st.session_state.resume_data["contact_info"]
    )

    # Resume Sections
    st.header("Resume Sections")
    
    # Add new section
    section_types = {
        "Paragraph": "paragraph",
        "Bullet Points": "bullet_points",
        "Experience": "experience"
    }
    
    new_section_type = st.selectbox("Add New Section Type", list(section_types.keys()))
    
    # When adding a new section, initialize its formatting
    if st.button("Add New Section"):
        new_section = {
            "type": section_types[new_section_type],
            "title": "",
            "content": "",
            "title_formatting": {
                "alignment": "left",
                "font_size": 16,
                "font_weight": "bold"
            },
            "content_formatting": {
                "alignment": "left",
                "font_size": 14,
                "font_weight": "normal"
            }
        }
        if new_section["type"] == "bullet_points":
            new_section["items"] = [""]
        elif new_section["type"] == "experience":
            new_section["items"] = [{
                "position": "",
                "company": "",
                "date_range": "",
                "bullet_points": [""],
                "formatting": {
                    "alignment": "left",
                    "font_size": 14,
                    "font_weight": "normal"
                }
            }]
        st.session_state.resume_data["sections"].append(new_section)
    
    # Edit existing sections
    for i, section in enumerate(st.session_state.resume_data["sections"]):
        # Ensure formatting exists for each section
        section.setdefault("title_formatting", {"alignment": "left", "font_size": 16, "font_weight": "bold"})
        section.setdefault("content_formatting", {"alignment": "left", "font_size": 14, "font_weight": "normal"})

        # Main section expander
        with st.expander(f"Section: {section.get('title', 'Untitled')}", expanded=True):
            section["title"] = st.text_input(f"Section Title {i+1}", section.get("title", ""), key=f"title_{i}")

            if section["type"] == "paragraph":
                section["content"] = st.text_area(f"Content {i+1}", section.get("content", ""), key=f"content_{i}")
            
            elif section["type"] == "bullet_points":
                if "items" not in section:
                    section["items"] = [""]
                
                for j, item in enumerate(section["items"]):
                    col1, col2 = st.columns([0.9, 0.1])
                    with col1:
                        section["items"][j] = st.text_input(f"Bullet Point {j+1}", item, key=f"bullet_{i}_{j}")
                    with col2:
                        if st.button("❌", key=f"remove_bullet_{i}_{j}") and len(section["items"]) > 1:
                            section["items"].pop(j)
                            st.rerun()
                
                if st.button("➕ Add Bullet Point", key=f"add_bullet_{i}"):
                    section["items"].append("")
            
            elif section["type"] == "experience":
                if "items" not in section:
                    section["items"] = [{"position": "", "company": "", "date_range": "", "bullet_points": [""]}]
                
                for j, exp in enumerate(section["items"]):
                    st.subheader(f"Experience {j+1}")
                    exp["position"] = st.text_input(f"Position {j+1}", exp.get("position", ""), key=f"position_{i}_{j}")
                    col1, col2 = st.columns(2)
                    with col1:
                        exp["company"] = st.text_input(f"Company {j+1}", exp.get("company", ""), key=f"company_{i}_{j}")
                    with col2:
                        # --- Month/Year Chooser ---
                        months = list(calendar.month_name)[1:]  # ['January', ..., 'December']
                        existing_range = exp.get("date_range", "")
                        # Default values
                        start_month, start_year = months[0], datetime.now().year
                        end_month, end_year = "", ""
                        end_type = "Present"

                        try:
                            if existing_range:
                                parts = existing_range.split(" - ")
                                # Parse start
                                if len(parts) > 0:
                                    sm, sy = parts[0].rsplit(" ", 1)
                                    if sm in months and sy.isdigit():
                                        start_month, start_year = sm, int(sy)
                                # Parse end
                                if len(parts) > 1:
                                    if parts[1] == "Present":
                                        end_type = "Present"
                                        end_month, end_year = "", ""
                                    else:
                                        em, ey = parts[1].rsplit(" ", 1)
                                        if em in months and ey.isdigit():
                                            end_type = "Specific Month"
                                            end_month, end_year = em, int(ey)
                        except Exception:
                            pass

                        start_month = st.selectbox(
                            f"Start Month {j+1}", months, index=months.index(start_month), key=f"start_month_{i}_{j}"
                        )
                        start_year = st.number_input(
                            f"Start Year {j+1}", min_value=1950, max_value=2100, value=start_year, key=f"start_year_{i}_{j}"
                        )
                        end_type = st.radio(
                            f"End Date Type {j+1}", ["Present", "Specific Month"], index=0 if end_type == "Present" else 1, key=f"end_type_{i}_{j}"
                        )
                        if end_type == "Specific Month":
                            end_month = st.selectbox(
                                f"End Month {j+1}", months, index=months.index(end_month) if end_month in months else 0, key=f"end_month_{i}_{j}"
                            )
                            end_year = st.number_input(
                                f"End Year {j+1}", min_value=1950, max_value=2100, value=end_year if isinstance(end_year, int) else datetime.now().year, key=f"end_year_{i}_{j}"
                            )
                            exp["date_range"] = f"{start_month} {start_year} - {end_month} {end_year}"
                        else:
                            exp["date_range"] = f"{start_month} {start_year} - Present"

                    st.write("Bullet Points:")
                    for k, bullet in enumerate(exp["bullet_points"]):
                        col1, col2 = st.columns([0.9, 0.1])
                        with col1:
                            exp["bullet_points"][k] = st.text_input(f"Bullet {k+1}", bullet, key=f"exp_bullet_{i}_{j}_{k}")
                        with col2:
                            if st.button("❌", key=f"remove_exp_bullet_{i}_{j}_{k}") and len(exp["bullet_points"]) > 1:
                                exp["bullet_points"].pop(k)
                                st.rerun()
                    
                    if st.button("➕ Add Bullet Point", key=f"add_exp_bullet_{i}_{j}"):
                        exp["bullet_points"].append("")
                    
                    if st.button("❌ Remove Experience", key=f"remove_exp_{i}_{j}") and len(section["items"]) > 1:
                        section["items"].pop(j)
                        st.rerun()
                
                if st.button("➕ Add Experience", key=f"add_exp_{i}"):
                    section["items"].append({"position": "", "company": "", "date_range": "", "bullet_points": [""]})
            
            if st.button("❌ Remove Section", key=f"remove_section_{i}"):
                st.session_state.resume_data["sections"].pop(i)
                st.rerun()

        # Section Formatting expander (NOT nested)
        with st.expander(f"Section Formatting: {section.get('title', 'Untitled')}", expanded=False):
            st.markdown("**Section Title Formatting**")
            col1, col2, col3 = st.columns(3)
            with col1:
                section["title_formatting"]["alignment"] = st.selectbox(
                    "Title Alignment", ["left", "center", "right"],
                    index=["left", "center", "right"].index(section["title_formatting"].get("alignment", "left")),
                    key=f"title_align_{i}"
                )
            with col2:
                section["title_formatting"]["font_size"] = st.number_input(
                    "Title Font Size", min_value=10, max_value=32, value=section["title_formatting"].get("font_size", 16),
                    key=f"title_fontsize_{i}"
                )
            with col3:
                section["title_formatting"]["font_weight"] = st.selectbox(
                    "Title Font Weight", ["normal", "bold", "bolder"],
                    index=["normal", "bold", "bolder"].index(section["title_formatting"].get("font_weight", "bold")),
                    key=f"title_fontweight_{i}"
                )

            st.markdown("**Section Content Formatting**")
            col1, col2, col3 = st.columns(3)
            with col1:
                section["content_formatting"]["alignment"] = st.selectbox(
                    "Content Alignment", ["left", "center", "right", "justify"],
                    index=["left", "center", "right", "justify"].index(section["content_formatting"].get("alignment", "left")),
                    key=f"content_align_{i}"
                )
            with col2:
                section["content_formatting"]["font_size"] = st.number_input(
                    "Content Font Size", min_value=10, max_value=32, value=section["content_formatting"].get("font_size", 14),
                    key=f"content_fontsize_{i}"
                )
            with col3:
                section["content_formatting"]["font_weight"] = st.selectbox(
                    "Content Font Weight", ["normal", "bold", "bolder"],
                    index=["normal", "bold", "bolder"].index(section["content_formatting"].get("font_weight", "normal")),
                    key=f"content_fontweight_{i}"
                )

    # Live Preview
    st.header("Live Resume Preview")
    sections_html = "".join(
        get_section_content(section["type"], section)
        for section in st.session_state.resume_data["sections"]
    )
    html_content = RESUME_TEMPLATE.format(
        name=st.session_state.resume_data["name"],
        title=st.session_state.resume_data["title"],
        contact_info=st.session_state.resume_data["contact_info"],
        sections=sections_html,
        **st.session_state.resume_data["formatting"]
    )
    st.components.v1.html(html_content, height=900, scrolling=True)

    # PDF Export Settings just below the preview
    with st.expander("PDF Export Settings", expanded=False):
        st.subheader("PDF Layout Settings")
        if "pdf_settings" not in st.session_state.resume_data:
            st.session_state.resume_data["pdf_settings"] = {
                "margins": {"top": "20mm", "right": "20mm", "bottom": "20mm", "left": "20mm"},
                "scale": 1.0,
                "page_size": "A4",
                "zoom": 1.0,
                "spacing": 1.3
            }
        st.session_state.resume_data["pdf_settings"]["page_size"] = st.selectbox(
            "Page Size",
            ["A4", "Letter", "Legal"],
            index=["A4", "Letter", "Legal"].index(st.session_state.resume_data["pdf_settings"].get("page_size", "A4"))
        )
        st.write("Margins")
        margins_col1, margins_col2 = st.columns(2)
        with margins_col1:
            top_margin = st.text_input(
                "Top Margin (e.g., 20mm)", 
                st.session_state.resume_data["pdf_settings"]["margins"].get("top", "20mm")
            )
            right_margin = st.text_input(
                "Right Margin (e.g., 20mm)", 
                st.session_state.resume_data["pdf_settings"]["margins"].get("right", "20mm")
            )
        with margins_col2:
            bottom_margin = st.text_input(
                "Bottom Margin (e.g., 20mm)", 
                st.session_state.resume_data["pdf_settings"]["margins"].get("bottom", "20mm")
            )
            left_margin = st.text_input(
                "Left Margin (e.g., 20mm)", 
                st.session_state.resume_data["pdf_settings"]["margins"].get("left", "20mm")
            )
        st.session_state.resume_data["pdf_settings"]["margins"] = {
            "top": top_margin,
            "right": right_margin,
            "bottom": bottom_margin,
            "left": left_margin
        }
        scale_zoom_col1, scale_zoom_col2 = st.columns(2)
        with scale_zoom_col1:
            st.session_state.resume_data["pdf_settings"]["scale"] = st.slider(
                "Content Scale", 
                min_value=0.5, 
                max_value=1.5, 
                value=float(st.session_state.resume_data["pdf_settings"].get("scale", 1.0)),
                step=0.05
            )
        with scale_zoom_col2:
            st.session_state.resume_data["pdf_settings"]["zoom"] = st.slider(
                "Zoom Level", 
                min_value=0.5, 
                max_value=1.5, 
                value=float(st.session_state.resume_data["pdf_settings"].get("zoom", 1.0)),
                step=0.05
            )
        st.session_state.resume_data["pdf_settings"]["spacing"] = st.slider(
            "Line Spacing", 
            min_value=1.0, 
            max_value=2.0, 
            value=float(st.session_state.resume_data["pdf_settings"].get("spacing", 1.3)),
            step=0.1
        )

    # Advanced Formatting Options just below PDF settings
    with st.expander("Advanced Formatting Options"):
        st.header("Formatting Options")
        col1, col2 = st.columns(2)
        with col1:
            st.session_state.resume_data["formatting"]["name_alignment"] = st.selectbox(
                "Name Alignment",
                ["left", "center", "right"],
                index=["left", "center", "right"].index(st.session_state.resume_data["formatting"]["name_alignment"])
            )
            st.session_state.resume_data["formatting"]["section_title_alignment"] = st.selectbox(
                "Section Title Alignment",
                ["left", "center", "right"],
                index=["left", "center", "right"].index(st.session_state.resume_data["formatting"]["section_title_alignment"])
            )
        with col2:
            st.session_state.resume_data["formatting"]["name_weight"] = st.selectbox(
                "Name Font Weight",
                ["normal", "bold", "bolder"],
                index=["normal", "bold", "bolder"].index(st.session_state.resume_data["formatting"]["name_weight"])
            )
            st.session_state.resume_data["formatting"]["paragraph_alignment"] = st.selectbox(
                "Paragraph Alignment",
                ["left", "center", "right", "justify"],
                index=["left", "center", "right", "justify"].index(st.session_state.resume_data["formatting"]["paragraph_alignment"])
            )

    # Save and Generate
    st.header("Save & Generate")
    email = st.text_input("Your Email (to save your resume)", "")
    
    if st.button("Save Resume") and email:
        save_resume(email, st.session_state.resume_data)
        st.success("Resume saved successfully!")
    
    if st.button("Generate PDF"):
        # Build HTML content
        sections_html = "".join(
            get_section_content(section["type"], section)
            for section in st.session_state.resume_data["sections"]
        )
        
        html_content = RESUME_TEMPLATE.format(
            name=st.session_state.resume_data["name"],
            title=st.session_state.resume_data["title"],
            contact_info=st.session_state.resume_data["contact_info"],
            sections=sections_html,
            **st.session_state.resume_data["formatting"]
        )
        
        # Call FastAPI backend to generate PDF with custom settings
        with st.spinner("Generating PDF..."):
            api_url = st.secrets["backend"]["url"] + "/generate-pdf"  # Use the secret for the API URL
            
            # Prepare the request with PDF settings
            pdf_request = {
                "html": html_content,
                **st.session_state.resume_data.get("pdf_settings", {})
            }
            
            response = requests.post(api_url, json=pdf_request)
            if response.status_code == 200:
                st.download_button(
                    label="Download PDF",
                    data=response.content,
                    file_name=f"{st.session_state.resume_data['name'].replace(' ', '_')}_Resume.pdf",
                    mime="application/pdf"
                )
            else:
                st.error(f"Failed to generate PDF. Error: {response.text}")

if __name__ == "__main__":
    main()