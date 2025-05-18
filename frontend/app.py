import calendar
import re
from datetime import datetime
from pathlib import Path

import requests
import streamlit as st
from pymongo import MongoClient

st.set_page_config(
    page_title="Buildit - Resume Builder",
    page_icon="📝",
    layout="wide",
    initial_sidebar_state="expanded",
)

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
                padding: 0 25px 25px 25px;
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
                margin-top: 0;
            }}

            .section-title {{
                font-weight: bold;
                margin-top: 20px;
                border-bottom: 1px solid #000;
                padding-bottom: 3px;
                text-align: {section_title_alignment};
            }}

            ul {{
                margin-top: 7px;
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

            a {{
                color: inherit;
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

def make_links_clickable(text):
    # Regex to find URLs
    url_pattern = re.compile(r'(https?://[^\s|]+)')
    # Replace URLs with anchor tags
    return url_pattern.sub(r'<a href="\1">\1</a>', text)

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
            date_html = f"<span style='float:right;'>{format_date_range(exp)}</span>" if format_date_range(exp) else ""
            company_html = f', {exp["company"]}' if exp.get("company") else ""
            items += (
                f'<p style="{content_style}"><strong>{exp.get("position", "")}</strong>{company_html} {date_html}</p>'
                f"<ul>{bullets}</ul>"
            )
        return f'<div class="section-title" style="{title_style}">{section_data["title"]}</div>{items}'
    elif section_type == "education":
        items = ""
        for edu in section_data["items"]:
            date_html = f"<span style='float:right;'>{format_date_range(edu)}</span>" if format_date_range(edu) else ""
            items += (
                f"<p style='{content_style}'><strong>{edu.get('degree', '')}</strong>, {edu.get('institution', '')} {date_html}</p>"
                f"<p style='{content_style}'>{edu.get('details', '')}</p>"
            )
        return f"<div class='section-title' style='{title_style}'>{section_data['title']}</div>{items}"
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

def format_date_range(exp):
    sm, sy = exp.get("start_month"), exp.get("start_year")
    et, em, ey = exp.get("end_type"), exp.get("end_month"), exp.get("end_year")

    # Only year present
    if not sy:
        return ""
    start = f"{sm} {sy}" if sm else f"{sy}"

    if et == "Present":
        return f"{start} - Present"
    elif et == "Specific Month" and ey:
        end = f"{em} {ey}" if em else f"{ey}"
        return f"{start} - {end}"
    else:
        return start

def icon_button(icon, key, tooltip="", on_click=None):
    btn_html = f"""
    <button title="{tooltip}" style="
        background: none;
        border: none;
        padding: 0 2px;
        margin: 0 2px;
        cursor: pointer;
        color: #fff;
        font-size: 1.1em;
        vertical-align: middle;
    ">{icon}</button>
    """
    return st.markdown(
        f'<span style="display:inline-block">{btn_html}</span>',
        unsafe_allow_html=True,
        key=key
    )

def main():
    st.markdown('<a name="load-resume"></a>', unsafe_allow_html=True)
    st.title("Professional Resume Builder")
    st.write("Create an ATS-friendly resume with your preferred formatting")
    
    # Initialize session state with safe defaults
    if 'resume_data' not in st.session_state:
        st.session_state.resume_data = {}

    # Load existing resume 
    with st.expander("Load Existing Resume"):
        email_to_load = st.text_input("Enter your email to load your resume")
        if st.button("Load Resume") and email_to_load:
            existing_resume = load_resume(email_to_load)
            if existing_resume:
                st.session_state.resume_data = existing_resume
                rd = st.session_state.resume_data
                rd.setdefault("formatting", {
                    "name_alignment": "center",
                    "name_weight": "bold",
                    "section_title_alignment": "center",
                    "paragraph_alignment": "left"
                })
                rd.setdefault("pdf_settings", {
                    "margins": {"top": "0mm", "right": "8mm", "bottom": "8mm", "left": "8mm"},
                    "scale": 1.0,
                    "page_size": "A4",
                    "zoom": 1.15,
                    "spacing": 1.3
                })
                rd.setdefault("sections", [])
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
            if response.status_code == 200:
                parsed = response.json()
                # Overwrite the entire resume_data for a clean autofill
                st.session_state.resume_data = parsed
                rd = st.session_state.resume_data
                rd.setdefault("formatting", {
                    "name_alignment": "center",
                    "name_weight": "bold",
                    "section_title_alignment": "center",
                    "paragraph_alignment": "left"
                })
                rd.setdefault("pdf_settings", {
                    "margins": {"top": "0mm", "right": "8mm", "bottom": "8mm", "left": "8mm"},
                    "scale": 1.0,
                    "page_size": "A4",
                    "zoom": 1.15,
                    "spacing": 1.3
                })
                rd.setdefault("sections", [])
                st.success("Resume parsed and autofilled! Please review and edit as needed.")
            else:
                st.error("Failed to parse resume. Please check your file format.")

    # Basic Info
    st.header("Basic Information")
    col1, col2 = st.columns(2)
    with col1:
        st.session_state.resume_data["name"] = st.text_input(
            "Full Name", st.session_state.resume_data.get("name", "Full Name")
        )
    with col2:
        st.session_state.resume_data["title"] = st.text_input(
            "Professional Title", st.session_state.resume_data.get("title", "Professional Title")
        )
    
    st.session_state.resume_data["contact_info"] = st.text_area(
        "Contact Information (separate items with '|')",
        st.session_state.resume_data.get("contact_info", "")
    )

    # Resume Sections
    st.header("Resume Sections")
    
    # Add new section
    section_types = {
        "Paragraph": "paragraph",
        "Bullet Points": "bullet_points",
        "Experience": "experience",
        "Education": "education"  # Add this line
    }
    
    new_section_type = st.selectbox("Add New Section Type", list(section_types.keys()))
    
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
                "date_range": None,
                "bullet_points": [""],
                "formatting": {
                    "alignment": "left",
                    "font_size": 14,
                    "font_weight": "normal"
                }
            }]
        elif new_section["type"] == "education":
            new_section["items"] = [{
                "degree": "",
                "institution": "",
                "dates": None,
                "details": ""
            }]
        st.session_state.resume_data["sections"].append(new_section)
    
    if "sections" not in st.session_state.resume_data or not isinstance(st.session_state.resume_data["sections"], list):
        st.session_state.resume_data["sections"] = []

    # --- REORDER SECTIONS ---
    for i, section in enumerate(st.session_state.resume_data["sections"]):
        anchor = f"section_{i}"
        st.markdown(f'<a name="{anchor}"></a>', unsafe_allow_html=True)
        colA, colB, colC = st.columns([0.1, 0.8, 0.1])
        with colA:
            if st.button("▲", key=f"move_up_{i}") and i > 0:
                st.session_state.resume_data["sections"][i-1], st.session_state.resume_data["sections"][i] = \
                    st.session_state.resume_data["sections"][i], st.session_state.resume_data["sections"][i-1]
                st.rerun()
                return  # <-- Add this line
        with colC:
            if st.button("▼", key=f"move_down_{i}") and i < len(st.session_state.resume_data["sections"]) - 1:
                st.session_state.resume_data["sections"][i+1], st.session_state.resume_data["sections"][i] = \
                    st.session_state.resume_data["sections"][i], st.session_state.resume_data["sections"][i+1]
                st.rerun()
                return  # <-- Add this line
        with colB:
            # Ensure formatting is a dict, not None
            if not isinstance(section.get("title_formatting"), dict):
                section["title_formatting"] = {"alignment": "left", "font_size": 16, "font_weight": "bold"}
            if not isinstance(section.get("content_formatting"), dict):
                section["content_formatting"] = {"alignment": "left", "font_size": 14, "font_weight": "normal"}

            with st.expander(f"Section: {section.get('title', 'Untitled')}", expanded=True):
                section["title"] = st.text_input(f"Section Title {i+1}", section.get("title", ""), key=f"title_{i}")

                if section["type"] == "paragraph":
                    section["content"] = st.text_area(f"Content {i+1}", section.get("content", ""), key=f"content_{i}")
                
                elif section["type"] == "bullet_points":
                    if "items" not in section:
                        section["items"] = [""]
                    
                    # --- REORDER BULLET POINTS ---
                    for j, item in enumerate(section["items"]):
                        bcol1, bcol2, bcol3, bcol4 = st.columns([0.05, 0.8, 0.05, 0.1])
                        with bcol1:
                            if st.button("▲", key=f"bp_up_{i}_{j}") and j > 0:
                                section["items"][j-1], section["items"][j] = section["items"][j], section["items"][j-1]
                                st.rerun()
                        with bcol3:
                            if st.button("▼", key=f"bp_down_{i}_{j}") and j < len(section["items"]) - 1:
                                section["items"][j+1], section["items"][j] = section["items"][j], section["items"][j+1]
                                st.rerun()
                        with bcol2:
                            section["items"][j] = st.text_input(f"Bullet Point {j+1}", item, key=f"bullet_{i}_{j}")
                        with bcol4:
                            if st.button("❌", key=f"remove_bullet_{i}_{j}") and len(section["items"]) > 1:
                                section["items"].pop(j)
                                st.rerun()
                    
                    if st.button("➕ Add Bullet Point", key=f"add_bullet_{i}"):
                        section["items"].append("")
                
                elif section["type"] == "experience":
                    if "items" not in section:
                        section["items"] = [{"position": "", "company": "", "date_range": "", "bullet_points": [""]}]
                    
                    # --- REORDER EXPERIENCE ITEMS ---
                    for j, exp in enumerate(section["items"]):
                        ecol1, ecol2, ecol3 = st.columns([0.05, 0.9, 0.05])
                        with ecol1:
                            if st.button("▲", key=f"exp_up_{i}_{j}") and j > 0:
                                section["items"][j-1], section["items"][j] = section["items"][j], section["items"][j-1]
                                st.rerun()
                        with ecol3:
                            if st.button("▼", key=f"exp_down_{i}_{j}") and j < len(section["items"]) - 1:
                                section["items"][j+1], section["items"][j] = section["items"][j], section["items"][j+1]
                                st.rerun()
                        with ecol2:
                            exp["date_range"] = exp.get("date_range") or ""
                            st.subheader(f"Experience {j+1}")
                            exp["position"] = st.text_input(f"Position {j+1}", exp.get("position", ""), key=f"position_{i}_{j}")
                            # Instead of columns, just stack the inputs vertically:
                            exp["company"] = st.text_input(f"Company {j+1}", exp.get("company", ""), key=f"company_{i}_{j}")
                            months = ["None"] + list(calendar.month_name)[1:]
                            years = ["None"] + [str(y) for y in range(1950, 2101)]

                            # Start Date
                            start_month = st.selectbox(
                                f"Start Month {j+1}", months,
                                index=0 if not exp.get("start_month") else months.index(exp["start_month"]),
                                key=f"start_month_{i}_{j}"
                            )
                            start_year = st.selectbox(
                                f"Start Year {j+1}", years,
                                index=0 if not exp.get("start_year") else years.index(str(exp["start_year"])),
                                key=f"start_year_{i}_{j}"
                            )

                            # End Date
                            end_type = st.radio(
                                f"End Date Type {j+1}", ["None", "Present", "Specific Month"],
                                index=0 if not exp.get("end_type") else ["None", "Present", "Specific Month"].index(exp["end_type"]),
                                key=f"end_type_{i}_{j}"
                            )
                            if end_type == "Specific Month":
                                end_month = st.selectbox(
                                    f"End Month {j+1}", months,
                                    index=0 if not exp.get("end_month") else months.index(exp["end_month"]),
                                    key=f"end_month_{i}_{j}"
                                )
                                end_year = st.selectbox(
                                    f"End Year {j+1}", years,
                                    index=0 if not exp.get("end_year") else years.index(str(exp["end_year"])),
                                    key=f"end_year_{i}_{j}"
                                )
                            else:
                                end_month = end_year = None

                            # Save back to the dict
                            exp["start_month"] = None if start_month == "None" else start_month
                            exp["start_year"] = None if start_year == "None" else start_year
                            exp["end_type"] = end_type
                            exp["end_month"] = None if (end_type != "Specific Month" or end_month == "None") else end_month
                            exp["end_year"] = None if (end_type != "Specific Month" or end_year == "None") else end_year

                        st.write("Bullet Points:")
                        # --- REORDER EXPERIENCE BULLETS ---
                        for k, bullet in enumerate(exp["bullet_points"]):
                            # Avoid nested columns inside columns (Streamlit limitation)
                            st.markdown(f"**Bullet {k+1}**")
                            bpcol = st.columns([0.1, 0.7, 0.1, 0.1])
                            with bpcol[0]:
                                if st.button("▲", key=f"exp_bp_up_{i}_{j}_{k}") and k > 0:
                                    exp["bullet_points"][k-1], exp["bullet_points"][k] = exp["bullet_points"][k], exp["bullet_points"][k-1]
                                    st.rerun()
                            with bpcol[2]:
                                if st.button("▼", key=f"exp_bp_down_{i}_{j}_{k}") and k < len(exp["bullet_points"]) - 1:
                                    exp["bullet_points"][k+1], exp["bullet_points"][k] = exp["bullet_points"][k], exp["bullet_points"][k+1]
                                    st.rerun()
                            with bpcol[1]:
                                exp["bullet_points"][k] = st.text_input(f"Bullet {k+1}", bullet, key=f"exp_bullet_{i}_{j}_{k}")
                            with bpcol[3]:
                                if st.button("❌", key=f"remove_exp_bullet_{i}_{j}_{k}") and len(exp["bullet_points"]) > 1:
                                    exp["bullet_points"].pop(k)
                                    st.rerun()
                        
                        if st.button("➕ Add Bullet Point", key=f"add_exp_bullet_{i}_{j}"):
                            exp["bullet_points"].append("")
                        
                        if st.button("❌ Remove Experience", key=f"remove_exp_{i}_{j}") and len(section["items"]) > 1:
                            section["items"].pop(j)
                            st.rerun()
                    
                    if st.button("➕ Add Experience", key=f"add_exp_{i}"):
                        section["items"].append({
                            "position": "",
                            "company": "",
                            "date_range": "",
                            "bullet_points": [""],
                            "formatting": {
                                "alignment": "left",
                                "font_size": 14,
                                "font_weight": "normal"
                            }
                        })
                        st.rerun()
                
                elif section["type"] == "education":
                    if "items" not in section:
                        section["items"] = [{
                            "degree": "",
                            "institution": "",
                            "dates": "",
                            "details": ""
                        }]
                    for j, edu in enumerate(section["items"]):
                        ecol1, ecol2, ecol3, ecol4, ecol5 = st.columns([0.2, 0.2, 0.2, 0.2, 0.2])
                        with ecol1:
                            edu["degree"] = st.text_input(f"Degree {j+1}", edu.get("degree", ""), key=f"edu_degree_{i}_{j}")
                        with ecol2:
                            edu["institution"] = st.text_input(f"Institution {j+1}", edu.get("institution", ""), key=f"edu_inst_{i}_{j}")
                        with ecol3:
                            months = ["None"] + list(calendar.month_name)[1:]
                            years = ["None"] + [str(y) for y in range(1950, 2101)]

                            # Start Date
                            edu_start_month = st.selectbox(
                                f"Start Month {j+1}", months,
                                index=0 if not edu.get("start_month") else months.index(edu["start_month"]),
                                key=f"edu_start_month_{i}_{j}"
                            )
                            edu_start_year = st.selectbox(
                                f"Start Year {j+1}", years,
                                index=0 if not edu.get("start_year") else years.index(str(edu["start_year"])),
                                key=f"edu_start_year_{i}_{j}"
                            )

                            # End Date
                            edu_end_type = st.radio(
                                f"End Date Type {j+1}", ["None", "Present", "Specific Month"],
                                index=0 if not edu.get("end_type") else ["None", "Present", "Specific Month"].index(edu["end_type"]),
                                key=f"edu_end_type_{i}_{j}"
                            )
                            if edu_end_type == "Specific Month":
                                edu_end_month = st.selectbox(
                                    f"End Month {j+1}", months,
                                    index=0 if not edu.get("end_month") else months.index(edu["end_month"]),
                                    key=f"edu_end_month_{i}_{j}"
                                )
                                edu_end_year = st.selectbox(
                                    f"End Year {j+1}", years,
                                    index=0 if not edu.get("end_year") else years.index(str(edu["end_year"])),
                                    key=f"edu_end_year_{i}_{j}"
                                )
                            else:
                                edu_end_month = edu_end_year = None

                            # Save back to the dict
                            edu["start_month"] = None if edu_start_month == "None" else edu_start_month
                            edu["start_year"] = None if edu_start_year == "None" else edu_start_year
                            edu["end_type"] = edu_end_type
                            edu["end_month"] = None if (edu_end_type != "Specific Month" or edu_end_month == "None") else edu_end_month
                            edu["end_year"] = None if (edu_end_type != "Specific Month" or edu_end_year == "None") else edu_end_year
                        with ecol4:
                            edu["details"] = st.text_input(f"Details {j+1}", edu.get("details", ""), key=f"edu_details_{i}_{j}")
                        with ecol5:
                            if st.button("❌", key=f"remove_edu_{i}_{j}") and len(section["items"]) > 1:
                                section["items"].pop(j)
                                st.rerun()
                    if st.button("➕ Add Education", key=f"add_edu_{i}"):
                        section["items"].append({
                            "degree": "",
                            "institution": "",
                            "dates": "",
                            "details": ""
                        })
                        st.rerun()
                
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

    rd = st.session_state.resume_data
    rd.setdefault("formatting", {
        "name_alignment": "center",
        "name_weight": "bold",
        "section_title_alignment": "center",
        "paragraph_alignment": "left"
    })
    # Live Preview
    st.markdown('<a name="live-resume-preview"></a>', unsafe_allow_html=True)
    st.header("Live Resume Preview")
    sections_html = "".join(
        get_section_content(section["type"], section)
        for section in st.session_state.resume_data["sections"]
    )
    contact_info_html = make_links_clickable(st.session_state.resume_data["contact_info"])

    html_content = RESUME_TEMPLATE.format(
        name=st.session_state.resume_data["name"],
        title=st.session_state.resume_data["title"],
        contact_info=contact_info_html,  # Use processed contact info
        sections=sections_html,
        **st.session_state.resume_data["formatting"]
    )
    st.components.v1.html(html_content, height=900, scrolling=True)

    # PDF Export Settings just below the preview
    with st.expander("PDF Export Settings", expanded=False):
        st.subheader("PDF Layout Settings")
        if "pdf_settings" not in st.session_state.resume_data:
            st.session_state.resume_data["pdf_settings"] = {
                "margins": {"top": "0mm", "right": "8mm", "bottom": "8mm", "left": "8mm"},
                "scale": 1.0,
                "page_size": "A4",
                "zoom": 1.15,
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
    st.markdown('<a name="save-generate"></a>', unsafe_allow_html=True)
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
        contact_info_html = make_links_clickable(st.session_state.resume_data["contact_info"])

        html_content = RESUME_TEMPLATE.format(
            name=st.session_state.resume_data["name"],
            title=st.session_state.resume_data["title"],
            contact_info=contact_info_html,  # Use processed contact info
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

    st.sidebar.title("Jump to Section")
    st.sidebar.markdown("[Load Existing Resume](#load-resume)", unsafe_allow_html=True)
    for i, section in enumerate(st.session_state.resume_data["sections"]):
        section_title = section.get("title", f"Section {i+1}")
        anchor = f"section_{i}"
        st.sidebar.markdown(f"[{section_title}](#{anchor})", unsafe_allow_html=True)
    st.sidebar.markdown("[Live Preview](#live-resume-preview)", unsafe_allow_html=True)
    st.sidebar.markdown("[Save & Generate](#save-generate)", unsafe_allow_html=True)

if __name__ == "__main__":
    main()