export interface ResumeData {
  name: string
  title: string
  contact_info: string
  sections: ResumeSection[]
  formatting: FormattingOptions
  pdf_settings: PDFSettings
}

export interface ResumeSection {
  type: "paragraph" | "bullet_points" | "experience" | "education"
  title: string
  content?: string
  items?: any[]
  title_formatting: SectionFormatting
  content_formatting: SectionFormatting
}

export interface SectionFormatting {
  alignment: "left" | "center" | "right" | "justify"
  font_size: number
  font_weight: "normal" | "bold" | "bolder"
}

export interface FormattingOptions {
  name_alignment: "left" | "center" | "right"
  name_weight: "normal" | "bold" | "bolder"
  section_title_alignment: "left" | "center" | "right"
  paragraph_alignment: "left" | "center" | "right" | "justify"
}

export interface PDFSettings {
  margins: {
    top: string
    right: string
    bottom: string
    left: string
  }
  scale: number
  page_size: "A4" | "Letter" | "Legal"
  zoom: number
  spacing: number
}

export interface ExperienceItem {
  position: string
  company: string
  start_month: string
  start_year: string
  end_type: "None" | "Present" | "Specific Month"
  end_month: string
  end_year: string
  bullet_points: string[]
}

export interface EducationItem {
  degree: string
  institution: string
  start_month: string
  start_year: string
  end_type: "None" | "Present" | "Specific Month"
  end_month: string
  end_year: string
  details: string
}

export const defaultResumeData: ResumeData = {
  name: "Full Name",
  title: "Professional Title",
  contact_info: "",
  sections: [],
  formatting: {
    name_alignment: "center",
    name_weight: "bold",
    section_title_alignment: "center",
    paragraph_alignment: "left",
  },
  pdf_settings: {
    margins: {
      top: "0mm",
      right: "8mm",
      bottom: "8mm",
      left: "8mm",
    },
    scale: 1.0,
    page_size: "A4",
    zoom: 1.15,
    spacing: 1.3,
  },
}
