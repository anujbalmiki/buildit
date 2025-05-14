from datetime import datetime
from pathlib import Path

import requests
import streamlit as st
from bson.objectid import ObjectId
from pymongo import MongoClient


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
            padding: 0;
            margin: 0;
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
    if section_type == "paragraph":
        return SECTION_TEMPLATES["paragraph"].format(
            title=section_data["title"],
            content=section_data["content"]
        )
    elif section_type == "bullet_points":
        items = "".join(f"<li>{item}</li>" for item in section_data["items"])
        return SECTION_TEMPLATES["bullet_points"].format(
            title=section_data["title"],
            items=items
        )
    elif section_type == "experience":
        items = "".join(
            SECTION_TEMPLATES["experience_item"].format(
                position=exp["position"],
                company=exp["company"],
                date_range=exp["date_range"],
                bullet_points="".join(f"<li>{bullet}</li>" for bullet in exp["bullet_points"])
            ) for exp in section_data["items"]
        )
        return SECTION_TEMPLATES["experience"].format(
            title=section_data["title"],
            items=items
        )
    return ""

def load_resume(email):
    resume = resumes.find_one({"email": email})
    if resume:
        return resume
    return None

def save_resume(email, resume_data):
    resume_data["last_updated"] = datetime.now()
    resumes.update_one(
        {"email": email},
        {"$set": resume_data},
        upsert=True
    )

def main():
    st.title("Professional Resume Builder")
    st.write("Create an ATS-friendly resume with your preferred formatting")

    # Initialize session state
    if 'resume_data' not in st.session_state:
        st.session_state.resume_data = {
            "name": "Anuj Balmiki",
            "title": "Python Backend Developer | Django, Flask, FastAPI | Docker | MSSQL | MongoDB",
            "contact_info": "Navi Mumbai, India | 7715031900 | anujbalmiki14@gmail.com | linkedin.com/in/anuj-balmiki | github.com/anujbalmiki",
            "sections": [],
            "formatting": {
                "name_alignment": "center",
                "name_weight": "bold",
                "section_title_alignment": "center",
                "paragraph_alignment": "left"
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

    # Basic Info
    st.header("Basic Information")
    col1, col2 = st.columns(2)
    with col1:
        st.session_state.resume_data["name"] = st.text_input("Full Name", st.session_state.resume_data["name"])
    with col2:
        st.session_state.resume_data["title"] = st.text_input("Professional Title", st.session_state.resume_data["title"])
    
    st.session_state.resume_data["contact_info"] = st.text_area("Contact Information (separate items with '|')", 
    st.session_state.resume_data["contact_info"])

    # Formatting Options
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

    # Resume Sections
    st.header("Resume Sections")
    
    # Add new section
    section_types = {
        "Paragraph": "paragraph",
        "Bullet Points": "bullet_points",
        "Experience": "experience"
    }
    
    new_section_type = st.selectbox("Add New Section Type", list(section_types.keys()))
    
    if st.button("Add New Section"):
        new_section = {"type": section_types[new_section_type], "title": "", "content": ""}
        if new_section["type"] == "bullet_points":
            new_section["items"] = [""]
        elif new_section["type"] == "experience":
            new_section["items"] = [{"position": "", "company": "", "date_range": "", "bullet_points": [""]}]
        st.session_state.resume_data["sections"].append(new_section)
    
    # Edit existing sections
    for i, section in enumerate(st.session_state.resume_data["sections"]):
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
                        exp["date_range"] = st.text_input(f"Date Range {j+1}", exp.get("date_range", ""), key=f"date_{i}_{j}")
                    
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
        
        # Call FastAPI backend to generate PDF
        with st.spinner("Generating PDF..."):
            api_url = "https://buildit-fg51.onrender.com/generate-pdf"  # Change to your deployed FastAPI URL
            response = requests.post(api_url, json={"html": html_content})
            if response.status_code == 200:
                st.download_button(
                    label="Download PDF",
                    data=response.content,
                    file_name=f"{st.session_state.resume_data['name'].replace(' ', '_')}_Resume.pdf",
                    mime="application/pdf"
                )
            else:
                st.error("Failed to generate PDF. Please try again.")

if __name__ == "__main__":
    main()
