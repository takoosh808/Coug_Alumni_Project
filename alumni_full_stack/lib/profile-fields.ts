/** Text fields intentionally accept custom answers; suggestions are never enums. */
export const profileGroups = {
  education: { degree: "Degree earned", major: "Major / academic program" },
  professional: {
    employment_status: "Employment status", job_title: "Current job title",
    current_company: "Current company", industry: "Industry",
    professional_location: "Professional location", expertise: "Expertise / interests",
  },
  support: {
    opportunities: "Willing to provide", support_interests: "How alumni or their organization can support WSU",
    participation_format: "Participation format", contact_frequency: "Engagement contact frequency",
    additional_comments: "Additional comments / opportunities",
  },
  privacy: {
    storage_consent: "Permission to store and use information", profile_visibility: "Who may view the profile",
    contact_visibility: "Contact information visibility", student_contact: "Student direct contact permission",
    alumni_updates: "Alumni news and updates",
  },
} as const;
export const textFields = Object.values(profileGroups).flatMap(group => Object.keys(group));
export type ProfileField = keyof typeof profileGroups.education | keyof typeof profileGroups.professional | keyof typeof profileGroups.support | keyof typeof profileGroups.privacy;
export type Education = { degree: string; major: string; graduation_year: number | null };
export const suggestions: Partial<Record<ProfileField, string[]>> = {
  degree: ["Bachelor of Arts (BA)", "Bachelor of Science (BS)", "Master of Science (MS)", "Doctor of Philosophy (PhD)", "Certificate"],
  major: ["Computer Engineering", "Computer Science", "Cybersecurity", "Data Analytics", "Electrical Engineering", "Software Engineering"],
  employment_status: ["Employed full time", "Employed part time", "Self-employed or entrepreneur", "Graduate or professional student", "Retired", "Not currently employed", "Prefer not to say"],
  opportunities: ["Internship opportunities", "Guest lecture", "Senior capstone project", "Company visit", "Resume help", "Career fair booth", "None"],
  industry: ["Software and technology", "Artificial intelligence and machine learning", "Aerospace and defense", "Semiconductor and computer hardware", "Energy and utilities", "Government and public sector", "Higher education and research", "K-12 education"],
  expertise: ["AI and ML", "Generative AI and foundation models", "Data science and analytics", "Software engineering", "Web development", "Mobile development", "Cybersecurity"],
  support_interests: ["Mentor a student", "Provide or share internship opportunities", "Deliver a guest lecture"],
  participation_format: ["In person", "Virtual", "Either in person or virtual", "Depends on the opportunity", "Not applicable at this time"],
  contact_frequency: ["As relevant opportunities arise", "No more than once per semester", "No more than once per year", "Only about the opportunities I selected", "Please do not contact me about engagement opportunities at this time"],
  storage_consent: ["Yes", "No"],
  profile_visibility: ["Authorized WSU EECS faculty and staff", "Authorized WSU EECS faculty, staff, and students", "Please contact me before displaying my profile", "Do not display my profile; use my information only for authorized departmental purposes"],
  contact_visibility: ["Email address only", "LinkedIn profile only", "Both email address and LinkedIn profile", "Neither", "Not applicable because I do not want my profile displayed"],
  student_contact: ["Yes by email", "Yes through LinkedIn", "Yes by either email or LinkedIn", "Only after receiving permission from WSU EECS", "No"],
  alumni_updates: ["I would like to receive occasional WSU EECS news and alumni updates", "Contact me only about engagement opportunities I selected", "I do not wish to receive general alumni communications"],
};
