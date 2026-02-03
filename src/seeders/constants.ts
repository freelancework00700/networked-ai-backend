import env from "../utils/validate-env";

export const DEFAULT_VIBES = [
    {
        id: "8c8f3a9e-7a4e-4b7e-9f6f-1b2c3d4e5f60",
        icon: "✈️",
        name: "Aviation, Aerospace & Defense",
    },
    {
        id: "1a2b3c4d-5e6f-4789-abcd-1234567890ab",
        icon: "🧑‍🎨",
        name: "Arts, Design & Creative Industries",
    },
    {
        id: "2b3c4d5e-6f70-489a-bcde-2345678901bc",
        icon: "🚜",
        name: "Agriculture & Environmental Science",
    },
    {
        id: "3c4d5e6f-7081-49ab-cdef-3456789012cd",
        icon: "📐",
        name: "Architecture & Interior Design",
    },
    {
        id: "4d5e6f70-8192-4abc-def0-4567890123de",
        icon: "🚗",
        name: "Automotive, Transportation & Logistics",
    },
    {
        id: "5e6f7081-9203-4bcd-ef01-5678901234ef",
        icon: "🧑‍💼",
        name: "Business & Administration",
    },
    {
        id: "6f708192-0314-4cde-f012-6789012345f0",
        icon: "⛪",
        name: "Church, Pastor & Spiritual Services",
    },
    {
        id: "70819203-1425-4def-0123-789012345601",
        icon: "🎯",
        name: "Coaching & Sports Training",
    },
    {
        id: "81920314-2536-40f0-1234-890123456712",
        icon: "🏗️",
        name: "Construction, Trades & Home Services",
    },
    {
        id: "92031425-3647-4012-2345-901234567823",
        icon: "📊",
        name: "Consulting, Strategy & Management",
    },
    {
        id: "03142536-4758-4123-3456-012345678934",
        icon: "🎨",
        name: "Content Creation, Media & Entertainment",
    },
    {
        id: "14253647-5869-4234-4567-123456789045",
        icon: "📞",
        name: "Customer Service & Support",
    },
    {
        id: "25364758-697a-4345-5678-234567890156",
        icon: "🚁",
        name: "Drones & Unmanned Aerial Vehicles",
    },
    {
        id: "36475869-7a8b-4456-6789-345678901267",
        icon: "📝",
        name: "Education, Training & Research",
    },
    {
        id: "4758697a-8b9c-4567-7890-456789012378",
        icon: "🏗️",
        name: "Environmental Health & Safety (EHS)",
    },
    {
        id: "58697a8b-9cad-4678-8901-567890123489",
        icon: "🧑‍🚒",
        name: "Security, Defense & Emergency Services",
    },
    {
        id: "697a8b9c-adbe-4789-9012-67890123459a",
        icon: "🌐",
        name: "Engineering & Technology",
    },
    {
        id: "7a8b9cad-becf-4890-0123-7890123456ab",
        icon: "📋",
        name: "Entrepreneurship & Startups",
    },
    {
        id: "8b9cadbe-cf01-49a1-1234-8901234567bc",
        icon: "🧑‍💼",
        name: "Executive & C-Level Leadership",
    },
    {
        id: "9cadbecf-0123-4ab2-2345-9012345678cd",
        icon: "🏢",
        name: "Facilities & Property Management",
    },
    {
        id: "adbecf01-2345-4bc3-3456-0123456789de",
        icon: "🏦",
        name: "Finance, Accounting & Investment",
    },
    {
        id: "becf0123-4567-4cd4-4567-1234567890ef",
        icon: "📉",
        name: "Investment, Asset Management & Venture Capital",
    },
    {
        id: "cf012345-6789-4de5-5678-2345678901f0",
        icon: "🧑‍🍳",
        name: "Food & Beverage Services",
    },
    {
        id: "01234567-89ab-4ef6-6789-345678901201",
        icon: "🎮",
        name: "Gaming & Esports",
    },
    {
        id: "12345678-9abc-40f7-7890-456789012312",
        icon: "👨‍⚖️",
        name: "Government, Public Services & Law Enforcement",
    },
    {
        id: "23456789-abcd-4108-8901-567890123423",
        icon: "🌿",
        name: "Health, Wellness & Medical Services",
    },
    {
        id: "3456789a-bcde-4219-9012-678901234534",
        icon: "🏨",
        name: "Hospitality, Travel & Tourism",
    },
    {
        id: "456789ab-cdef-432a-0123-789012345645",
        icon: "🧳",
        name: "Human Resources & Recruitment",
    },
    {
        id: "56789abc-def0-443b-1234-890123456756",
        icon: "🛡️",
        name: "Insurance & Risk Management",
    },
    {
        id: "6789abcd-ef01-454c-2345-901234567867",
        icon: "💡",
        name: "Innovation, Product Design & R&D",
    },
    {
        id: "789abcde-f012-465d-3456-012345678978",
        icon: "🧑‍⚕️",
        name: "Mental Health & Counseling",
    },
    {
        id: "89abcdef-0123-476e-4567-123456789089",
        icon: "⚖️",
        name: "Legal & Compliance",
    },
    {
        id: "9abcdef0-1234-487f-5678-23456789019a",
        icon: "📦",
        name: "Logistics, Transportation & Supply Chain",
    },
    {
        id: "abcdef01-2345-4980-6789-3456789012ab",
        icon: "🔬",
        name: "Laboratory & Technical Services",
    },
    {
        id: "bcdef012-3456-4a91-7890-4567890123bc",
        icon: "📣",
        name: "Marketing, PR & Communications",
    },
    {
        id: "cdef0123-4567-4ba2-8901-5678901234cd",
        icon: "💻",
        name: "IT, Software Development & Cybersecurity",
    },
    {
        id: "def01234-5678-4cb3-9012-6789012345de",
        icon: "🛠️",
        name: "Manufacturing, Production & Industry",
    },
    {
        id: "ef012345-6789-4dc4-0123-7890123456ef",
        icon: "🧑‍🏫",
        name: "Non-Profit & Social Services",
    },
    {
        id: "f0123456-789a-4ed5-1234-8901234567f0",
        icon: "📞",
        name: "Project Management & Coordination",
    },
    {
        id: "01234567-89ab-4fe6-2345-901234567801",
        icon: "🔬",
        name: "Science, Research & Development",
    },
    {
        id: "12345678-9abc-40f7-3456-012345678912",
        icon: "🏢",
        name: "Real Estate Development & Property Management",
    },
    {
        id: "23456789-abcd-4108-4567-123456789023",
        icon: "👴",
        name: "Retired Professional",
    },
    {
        id: "3456789a-bcde-4219-5678-234567890134",
        icon: "🛍️",
        name: "Retail, E-commerce & Consumer Goods",
    },
    {
        id: "456789ab-cdef-432a-6789-345678901245",
        icon: "🚀",
        name: "Sales & Business Development",
    },
    {
        id: "56789abc-def0-443b-7890-456789012356",
        icon: "🧑‍🔧",
        name: "Skilled Trades & Maintenance",
    },
    {
        id: "6789abcd-ef01-454c-8901-567890123467",
        icon: "🎭",
        name: "Performing Arts & Entertainment",
    },
    {
        id: "789abcde-f012-465d-9012-678901234578",
        icon: "🔬",
        name: "Specialized Roles & Other Professions",
    },
    {
        id: "89abcdef-0123-476e-0123-789012345689",
        icon: "🌱",
        name: "Sustainability, Environmental & Conservation",
    },
    {
        id: "9abcdef0-1234-487f-1234-89012345679a",
        icon: "📡",
        name: "Telecommunications & Technology Services",
    },
    {
        id: "abcdef01-2345-4980-2345-9012345678ab",
        icon: "📜",
        name: "Translation & Language Services",
    },
    {
        id: "bcdef012-3456-4a91-3456-0123456789bc",
        icon: "📉",
        name: "Unemployed & Job Seeking",
    },
    {
        id: "cdef0123-4567-4ba2-4567-1234567890cd",
        icon: "🎓",
        name: "Student, Intern & Recent Graduate",
    },
];

export const DEFAULT_INTERESTS = [
    {
        id: "8f4e2b9c-1a3d-4c8e-9f01-23456789abcd",
        icon: "🏅",
        name: " Awards, Recognition & Certifications",
    },
    {
        id: "9a5c3d7e-2b4f-4d9f-a012-3456789abcde",
        icon: "🏦",
        name: " Banking & Financial Services",
    },
    {
        id: "1b6d4e8f-3c5a-4e0a-b123-456789abcdef",
        icon: "🗃️",
        name: " Business Funding & Grants",
    },
    {
        id: "2c7e5f90-4d6b-4f1b-c234-56789abcdef0",
        icon: "📈",
        name: " Business Strategy & Growth",
    },
    {
        id: "3d8f60a1-5e7c-402c-d345-6789abcdef01",
        icon: "🚀",
        name: " Building a Startup",
    },
    {
        id: "4e9071b2-6f8d-413d-e456-789abcdef012",
        icon: "👥",
        name: " Community Building & Networking Groups",
    },
    {
        id: "5fa182c3-709e-424e-f567-89abcdef0123",
        icon: "🎨",
        name: " Content Collaboration",
    },
    {
        id: "60b293d4-81af-435f-0678-9abcdef01234",
        icon: "📝",
        name: " Consulting & Advisory",
    },
    {
        id: "71c3a4e5-92b0-4460-1789-abcdef012345",
        icon: "💬",
        name: " Customer Experience & Service",
    },
    {
        id: "82d4b5f6-a3c1-4571-289a-bcdef0123456",
        icon: "📊",
        name: " Data & Analytics",
    },
    {
        id: "93e5c607-b4d2-4682-39ab-cdef01234567",
        icon: "📱",
        name: " Digital Transformation & Automation",
    },
    {
        id: "a4f6d718-c5e3-4793-4abc-def012345678",
        icon: "🛒",
        name: " E-commerce & Retail",
    },
    {
        id: "b507e829-d6f4-48a4-5bcd-ef0123456789",
        icon: "🎉",
        name: " Event Attendance & Socializing",
    },
    {
        id: "c618f93a-e705-49b5-6cde-f0123456789a",
        icon: "📅",
        name: " Event Planning & Participation",
    },
    {
        id: "d7290a4b-f816-40c6-7def-123456789abc",
        icon: "✝️",
        name: " Faith & Spirituality",
    },
    {
        id: "e83a1b5c-0927-41d7-8ef0-23456789abcd",
        icon: "🤝",
        name: " General Networking",
    },
    {
        id: "f94b2c6d-1a38-42e8-9f01-3456789abcde",
        icon: "💼",
        name: " Freelancing & Gig Opportunities",
    },
    {
        id: "0a5c3d7e-2b49-43f9-a012-456789abcdef",
        icon: "💼",
        name: " Franchise Ownership & Licensing",
    },
    {
        id: "1b6d4e8f-3c5a-440a-b123-56789abcdef0",
        icon: "🤝",
        name: " Hiring & Talent Acquisition",
    },
    {
        id: "2c7e5f90-4d6b-451b-c234-6789abcdef01",
        icon: "🏋️",
        name: " Health & Wellness",
    },
    {
        id: "3d8f60a1-5e7c-462c-d345-789abcdef012",
        icon: "🧳",
        name: " International Business Expansion",
    },
    {
        id: "4e9071b2-6f8d-473d-e456-89abcdef0123",
        icon: "💰",
        name: " Investment Opportunities",
    },
    {
        id: "5fa182c3-709e-484e-f567-9abcdef01234",
        icon: "💼",
        name: " Job Opportunities",
    },
    {
        id: "60b293d4-81af-495f-0678-abcdef012345",
        icon: "👨‍💼",
        name: " Leadership & Management",
    },
    {
        id: "71c3a4e5-92b0-4a60-1789-bcdef0123456",
        icon: "⚖️",
        name: " Legal & Compliance",
    },
    {
        id: "82d4b5f6-a3c1-4b71-289a-cdef01234567",
        icon: "📣",
        name: " Marketing & Branding",
    },
    {
        id: "93e5c607-b4d2-4c82-39ab-def012345678",
        icon: "🔍",
        name: " Market Research & Insights",
    },
    {
        id: "a4f6d718-c5e3-4d93-4abc-ef0123456789",
        icon: "🧑‍🏫",
        name: " Mentorship & Coaching",
    },
    {
        id: "b507e829-d6f4-4ea4-5bcd-f0123456789a",
        icon: "🏛️",
        name: " Non-Profit & Fundraising",
    },
    {
        id: "c618f93a-e705-4fb5-6cde-0123456789ab",
        icon: "🛠️",
        name: " Operations & Process Improvement",
    },
    {
        id: "d7290a4b-f816-4006-7def-123456789abd",
        icon: "📬",
        name: " Partnerships & Collaborations",
    },
    {
        id: "e83a1b5c-0927-4117-8ef0-23456789abce",
        icon: "🎨",
        name: " Personal Hobbies & Interests",
    },
    {
        id: "f94b2c6d-1a38-4228-9f01-3456789abcdf",
        icon: "📂",
        name: " Project Management",
    },
    {
        id: "0a5c3d7e-2b49-4339-a012-456789abcdf0",
        icon: "🧩",
        name: " Product Management & Development",
    },
    {
        id: "1b6d4e8f-3c5a-444a-b123-56789abcdf01",
        icon: "🗣️",
        name: " Public Relations & Media",
    },
    {
        id: "2c7e5f90-4d6b-455b-c234-6789abcdf012",
        icon: "📚",
        name: " Publishing & Writing",
    },
    {
        id: "3d8f60a1-5e7c-466c-d345-789abcdf0123",
        icon: "🎤",
        name: " Public Speaking & Thought Leadership",
    },
    {
        id: "4e9071b2-6f8d-477d-e456-89abcdf01234",
        icon: "🛡️",
        name: " Risk Management & Security",
    },
    {
        id: "5fa182c3-709e-488e-f567-9abcdf012345",
        icon: "📈",
        name: " Sales & Business Development",
    },
    {
        id: "60b293d4-81af-499f-0678-abcdf0123456",
        icon: "🌐",
        name: " Social Impact & CSR",
    },
    {
        id: "71c3a4e5-92b0-4a00-1789-bcdf01234567",
        icon: "💻",
        name: " Software Development & IT",
    },
    {
        id: "82d4b5f6-a3c1-4b11-289a-cdf012345678",
        icon: "🚚",
        name: " Supply Chain & Logistics",
    },
    {
        id: "93e5c607-b4d2-4c22-39ab-df0123456789",
        icon: "🌱",
        name: " Sustainability & Green Initiatives",
    },
    {
        id: "a4f6d718-c5e3-4d33-4abc-f0123456789a",
        icon: "🧠",
        name: " Upskilling & Professional Development",
    },
];

export const DEFAULT_HOBBIES = [
    {
        id: "1f2e3d4c-5b6a-7980-9123-456789abcdef",
        icon: "🛠️",
        name: "Automotive & Car Enthusiasts",
    },
    {
        id: "2a3b4c5d-6e7f-8091-0234-56789abcdef0",
        icon: "🏸",
        name: "Badminton & Racquet Sports",
    },
    {
        id: "3b4c5d6e-7f80-9012-1345-6789abcdef01",
        icon: "🚴",
        name: "Biking & Cycling",
    },
    {
        id: "4c5d6e7f-8091-0123-2456-789abcdef012",
        icon: "🐦",
        name: "Bird Watching & Nature Exploration",
    },
    {
        id: "5d6e7f80-9012-1234-3567-89abcdef0123",
        icon: "📚",
        name: "Book Club & Reading",
    },
    {
        id: "6e7f8091-0123-2345-4678-9abcdef01234",
        icon: "🎳",
        name: "Bowling",
    },
    {
        id: "7f809102-1234-3456-5789-abcdef012345",
        icon: "🎲",
        name: "Board Games & Puzzles",
    },
    {
        id: "80910213-2345-4567-689a-bcdef0123456",
        icon: "🧵",
        name: "Crafts & DIY Projects",
    },
    {
        id: "90121324-3456-5678-79ab-cdef01234567",
        icon: "✍️",
        name: "Creative Writing & Journaling",
    },
    {
        id: "01232435-4567-6789-8abc-def012345678",
        icon: "🍳",
        name: "Cooking & Baking",
    },
    {
        id: "12343546-5678-789a-9bcd-ef0123456789",
        icon: "🍻",
        name: "Craft Beer & Homebrewing",
    },
    {
        id: "23454657-6789-89ab-acde-f0123456789a",
        icon: "🎯",
        name: "Darts & Bar Games",
    },
    {
        id: "34565768-789a-9abc-bdef-0123456789ab",
        icon: "🛠️",
        name: "DIY Home Improvement",
    },
    {
        id: "45676879-89ab-abcd-cf01-123456789abc",
        icon: "🪴",
        name: "Houseplants & Indoor Gardening",
    },
    {
        id: "5678798a-9abc-bcde-d012-23456789abcd",
        icon: "🎣",
        name: "Fishing",
    },
    {
        id: "67898a9b-abcd-cdef-e123-3456789abcde",
        icon: "🧘",
        name: "Fitness & Yoga",
    },
    {
        id: "789a9bac-bcde-def0-f234-456789abcdef",
        icon: "🏋️",
        name: "Weightlifting & Bodybuilding",
    },
    {
        id: "89abacbd-cdef-ef01-0345-56789abcdef0",
        icon: "🏌️‍♂️",
        name: "Golf",
    },
    {
        id: "9abcbdce-def0-f012-1456-6789abcdef01",
        icon: "🌿",
        name: "Gardening & Landscaping",
    },
    {
        id: "abcde0f1-0f12-1234-2567-789abcdef012",
        icon: "🎻",
        name: "Classical Music & Opera",
    },
    {
        id: "bcdef102-1a23-2345-3678-89abcdef0123",
        icon: "🧗",
        name: "Hiking & Climbing",
    },
    {
        id: "cdef2103-2b34-3456-4789-9abcdef01234",
        icon: "📜",
        name: "History & Museums",
    },
    {
        id: "def32104-3c45-4567-589a-abcdef012345",
        icon: "🏇",
        name: "Horse Riding",
    },
    {
        id: "ef432105-4d56-5678-69ab-bcdef0123456",
        icon: "🏡",
        name: "Home Automation & Smart Homes",
    },
    {
        id: "f0543216-5e67-6789-7abc-cdef01234567",
        icon: "🚀",
        name: "Investing & Trading",
    },
    {
        id: "01654327-6f78-789a-8bcd-def012345678",
        icon: "🎧",
        name: "Music & Concerts",
    },
    {
        id: "12765438-7089-89ab-9cde-ef0123456789",
        icon: "🎥",
        name: "Movies & Film",
    },
    {
        id: "23876549-819a-9abc-adef-f0123456789a",
        icon: "🚲",
        name: "Motorcycling & Biking",
    },
    {
        id: "3498765a-92ab-abcd-bf01-0123456789ab",
        icon: "🖌️",
        name: "Model Building",
    },
    {
        id: "45a9876b-a3bc-bcde-c012-123456789abc",
        icon: "🪂",
        name: "Skydiving & Paragliding",
    },
    {
        id: "56ba987c-b4cd-cdef-d123-23456789abcd",
        icon: "🎤",
        name: "Karaoke & Singing",
    },
    {
        id: "67cba98d-c5de-def0-e234-3456789abcde",
        icon: "🚙",
        name: "Off-Roading & Adventure Sports",
    },
    {
        id: "78dbc09e-d6ef-ef01-f345-456789abcdef",
        icon: "🎫",
        name: "Festivals & Cultural Events",
    },
    {
        id: "89ecd0af-e701-0123-0465-56789abcdef0",
        icon: "📐",
        name: "Technology & Gadgets",
    },
    {
        id: "9afde1b0-f812-1234-1576-6789abcdef01",
        icon: "🎨",
        name: "Painting & Drawing",
    },
    {
        id: "ab0ef2c1-0913-2345-2687-789abcdef012",
        icon: "🐾",
        name: "Pet Care & Animal Lovers",
    },
    {
        id: "bc1f03d2-1a24-3456-3798-89abcdef0123",
        icon: "📸",
        name: "Photography",
    },
    {
        id: "cd2014e3-2b35-4567-48a9-9abcdef01234",
        icon: "🧩",
        name: "Puzzle & Brain Games",
    },
    {
        id: "de3125f4-3c46-5678-59ba-abcdef012345",
        icon: "🧩",
        name: "Collecting",
    },
    {
        id: "ef423605-4d57-6789-6acb-bcdef0123456",
        icon: "🎮",
        name: "Video Games & Esports",
    },
    {
        id: "f0534716-5e68-789a-7bdc-cdef01234567",
        icon: "🛶",
        name: "Water Sports & Boating",
    },
    {
        id: "10545827-6f79-89ab-8ced-def012345678",
        icon: "📷",
        name: "Videography & Vlogging",
    },
    {
        id: "21656938-708a-9abc-9dfe-ef0123456789",
        icon: "🌌",
        name: "Stargazing & Astronomy",
    },
    {
        id: "32767a49-819b-abcd-aef0-f0123456789a",
        icon: "🛹",
        name: "Skateboarding & Roller Sports",
    },
    {
        id: "43878b5a-92ac-bcde-bf01-0123456789ab",
        icon: "🏂",
        name: "Snow Sports",
    },
    {
        id: "54989c6b-a3bd-cdef-c012-123456789abc",
        icon: "🛒",
        name: "Thrifting & Vintage Collecting",
    },
    {
        id: "65a9ad7c-b4ce-def0-d123-23456789abcd",
        icon: "🏊",
        name: "Swimming & Water Sports",
    },
    {
        id: "76babd8d-c5df-ef01-e234-3456789abcde",
        icon: "🎭",
        name: "Theater & Performing Arts",
    },
    {
        id: "87cbce9e-d6e0-0123-f345-456789abcdef",
        icon: "🚚",
        name: "Travel & Adventure",
    },
    {
        id: "98dcdfa0-e7f1-1234-0356-56789abcdef0",
        icon: "🎷",
        name: "Musical Instruments & Bands",
    },
    {
        id: "a9ede0b1-f802-2345-1467-6789abcdef01",
        icon: "🚤",
        name: "Sailing & Yachting",
    },
    {
        id: "bafe01c2-0913-3456-2578-789abcdef012",
        icon: "🧠",
        name: "Personal Development & Self-Improvement",
    },
    {
        id: "cb0f12d3-1a24-4567-3689-89abcdef0123",
        icon: "🧑‍🤝‍🧑",
        name: "Community Service & Volunteering",
    },
    {
        id: "dc1023e4-2b35-5678-479a-9abcdef01234",
        icon: "🎧",
        name: "Podcasting & Audio Content",
    },
    {
        id: "ed2134f5-3c46-6789-58ab-abcdef012345",
        icon: "♟️",
        name: "Chess & Strategy Games",
    },
];

export const DEFAULT_REPORT_REASONS = [
    {
        id: "1a2b3c4d-5e6f-7081-92a3-456789abcdef",
        reason: "Violent event",
        order: 1,
    },
    {
        id: "2b3c4d5e-6f70-8192-a3b4-56789abcdef0",
        reason: "Hateful or abusive event",
        order: 2,
    },
    {
        id: "3c4d5e6f-7081-9203-b4c5-6789abcdef01",
        reason: "Harassment or bullying",
        order: 3,
    },
    {
        id: "4d5e6f70-8192-a314-c5d6-789abcdef012",
        reason: "Harmful or dangerous acts",
        order: 4,
    },
    {
        id: "5e6f7081-9203-b425-d6e7-89abcdef0123",
        reason: "Misinformation",
        order: 5,
    },
    {
        id: "6f708192-a314-c536-e7f8-9abcdef01234",
        reason: "Child abuse",
        order: 6,
    },
    {
        id: "708192a3-b425-d647-f809-abcdef012345",
        reason: "Promotes terrorism",
        order: 7,
    },
    {
        id: "8192a3b4-c536-e758-091a-bcdef0123456",
        reason: "Legal issues",
        order: 8,
    },
    {
        id: "92a3b4c5-d647-f869-1a2b-cdef01234567",
        reason: "Spam or misleading",
        order: 9,
    },
    {
        id: "a3b4c5d6-e758-097a-2b3c-def012345678",
        reason: "Others",
        order: 10,
    },
];

export const DEFAULT_EVENT_CATEGORIES = [
    {
        id: "f1a2b3c4-d5e6-4789-8012-3456789abcde",
        icon: "🏕️",
        name: "Adventure & Outdoors",
    },
    {
        id: "a2b3c4d5-e6f7-4890-9123-456789abcdef",
        icon: "🎵",
        name: "Artist & Music",
    },
    {
        id: "b3c4d5e6-f708-4901-a234-56789abcdef0",
        icon: "📚",
        name: "Books & Literature",
    },
    {
        id: "c4d5e6f7-0819-4a12-b345-6789abcdef01",
        icon: "📝",
        name: "Business & Professional",
    },
    {
        id: "d5e6f708-192a-4b23-c456-789abcdef012",
        icon: "✝️",
        name: "Church & Spirituality",
    },
    {
        id: "e6f70819-2a3b-4c34-d567-89abcdef0123",
        icon: "🧑🏻",
        name: "College & University",
    },
    {
        id: "f708192a-3b4c-4d45-e678-9abcdef01234",
        icon: "🎤",
        name: "Conferences & Seminars",
    },
    {
        id: "08192a3b-4c5d-4e56-f789-abcdef012345",
        icon: "🏛️",
        name: "Cultural & Heritage",
    },
    {
        id: "192a3b4c-5d6e-4078-089a-bcdef0123456",
        icon: "💌",
        name: "Dating & Socials",
    },
    {
        id: "2a3b4c5d-6e7f-4189-19ab-cdef01234567",
        icon: "🏫",
        name: "Education & Workshops",
    },
    {
        id: "3b4c5d6e-7f80-429a-2abc-def012345678",
        icon: "🎨",
        name: "Fashion, Art & Design",
    },
    {
        id: "4c5d6e7f-8091-43ab-3bcd-ef0123456789",
        icon: "🍔",
        name: "Food, Drink & Culinary",
    },
    {
        id: "5d6e7f80-9012-44bc-4cde-f0123456789a",
        icon: "📺",
        name: "Film & TV",
    },
    {
        id: "6e7f8091-0123-45cd-5def-123456789abc",
        icon: "🎮",
        name: "Gaming & Technology",
    },
    {
        id: "7f809102-1234-46de-6ef0-23456789abcd",
        icon: "🏃🏻‍♂",
        name: "Health, Sports & Wellness",
    },
    {
        id: "80910213-2345-47ef-7f01-3456789abcde",
        icon: "🍾",
        name: "Nightlife & Parties",
    },
    {
        id: "90121324-3456-4801-8012-456789abcdef",
        icon: "🧑🏻‍🤝‍🧑🏻",
        name: "Social & Community",
    },
    {
        id: "01232435-4567-4912-9123-56789abcdef0",
        icon: "🗻",
        name: "Travel & Exploration",
    },
    {
        id: "12343546-5678-4a23-a234-6789abcdef01",
        icon: "💒",
        name: "Weddings & Celebrations",
    },
];

export const DEFAULT_GAMIFICATION_CATEGORIES = [
    {
        id: "10defe98-a79b-466c-81cf-4d59632197c4",
        name: "Host an Event",
        earned_points: "50",
    },
    {
        id: "c34da124-dd4e-4732-9f01-6a59ffb6c2fc",
        name: "Attend an Event",
        earned_points: "25",
    },
    {
        id: "93277a8f-f231-49df-a4a7-02e9569a9207",
        name: "Make a New Connection",
        earned_points: "10",
    },
    {
        id: "a552dd69-d74a-4c67-a572-15df4b39a156",
        name: "Scan a QR Code",
        earned_points: "5",
    },
    {
        id: "b663ef7a-e85b-4d78-b683-26fafc4a8267",
        name: "Send a Message",
        earned_points: "2",
    }
];

export const DEFAULT_GAMIFICATION_DIAMONDS   = [
    {
        id: "a1ea9e20-13af-4b22-91db-90cc8c109e57",
        color: "green",
        points: "1000",
        description: "Newcomer – Just getting started",
        priority: 1,
        icon_url: `${env.API_URL}/media/Diamond/1k-diamond.svg`,
    },
    {
        id: "28304b7b-354f-4af3-b719-8ca28c53ecfa",
        color: "Red",
        points: "5000",
        description: "Contributor - You’re in the mix",
        priority: 2,
        icon_url: `${env.API_URL}/media/Diamond/5k-diamond.svg`,
    },
    {
        id: "2e118aed-bc68-4bc8-9e1f-f2587a5c7017",
        color: "Blue",
        points: "10000",
        description: "Connector - People know your name",
        priority: 3,
        icon_url: `${env.API_URL}/media/Diamond/10k-diamond.svg`,
    },
    {
        id: "21254e2e-d5cd-487a-925b-74d72c4206b1",
        color: "Purple",
        points: "20000",
        description: "Leader – You drive the culture",
        priority: 4,
        icon_url: `${env.API_URL}/media/Diamond/20k-diamond.svg`,
    },
    {
        id: "d904961a-771b-49cd-a931-0053a9b06904",
        color: "Gold",
        points: "30000",
        description: "Influencer – Your events shift rooms",
        priority: 5,
        icon_url: `${env.API_URL}/media/Diamond/30k-diamond.svg`,
    },
    {
        id: "e015a72b-882c-4a3d-b04e-1164b0c17a15",
        color: "Platinum",
        points: "40000",
        description: "Visionary – Everyone watches your moves",
        priority: 6,
        icon_url: `${env.API_URL}/media/Diamond/40k-diamond.svg`,
    },
    {
        id: "f126b83c-993d-4b4e-c15f-2275c1d28b26",
        color: "Black",
        points: "50000",
        description: "Legacy Builder – You’ve shaped the Network",
        priority: 7,
        icon_url: `${env.API_URL}/media/Diamond/50k-diamond.svg`,
    }
];

export const DEFAULT_GAMIFICATION_BADGES = [
    {
        id: "1a2b3c4d-5e6f-7081-92a3-456789abcdef",
        event_count: "10",
        badge: "Green",
        title:"Rookie",
        priority: 1,
        locked_url: `${env.API_URL}/media/Badge/10-locked.svg`,
        event_hosted_url: `${env.API_URL}/media/Badge/10-event-hosted.svg`,
        event_attended_url: `${env.API_URL}/media/Badge/10-event-attended.svg`,
        networks_url: `${env.API_URL}/media/Badge/10-networks.svg`,
        messages_url: `${env.API_URL}/media/Badge/10-messages.svg`,
        qr_url: `${env.API_URL}/media/Badge/10-qr.svg`,
    },
    {
        id: "26fb6289-b9ce-49c5-9a7e-419af4ea8aa3",
        event_count: "25",
        badge: "Red",
        title:"Emerging Organizer",
        priority: 2,
        locked_url: `${env.API_URL}/media/Badge/25-locked.svg`,
        event_hosted_url: `${env.API_URL}/media/Badge/25-event-hosted.svg`,
        event_attended_url: `${env.API_URL}/media/Badge/25-event-attended.svg`,
        networks_url: `${env.API_URL}/media/Badge/25-networks.svg`,
        messages_url: `${env.API_URL}/media/Badge/25-messages.svg`,
        qr_url: `${env.API_URL}/media/Badge/25-qr.svg`,
    },
    {
        id: "81cd84d9-bb46-4fc8-8109-596130204d70",
        event_count: "50",
        badge: "Teal",
        title:"Community Starter",
        priority: 3,
        locked_url: `${env.API_URL}/media/Badge/50-locked.svg`,
        event_hosted_url: `${env.API_URL}/media/Badge/50-event-hosted.svg`,
        event_attended_url: `${env.API_URL}/media/Badge/50-event-attended.svg`,
        networks_url: `${env.API_URL}/media/Badge/50-networks.svg`,
        messages_url: `${env.API_URL}/media/Badge/50-messages.svg`,
        qr_url: `${env.API_URL}/media/Badge/50-qr.svg`,
    },
    {
        id: "6147e23a-547f-48aa-8ee2-7331eeb6f859",
        event_count: "100",
        badge: "Purple",
        title:"Event Builder",
        priority: 4,
        locked_url: `${env.API_URL}/media/Badge/100-locked.svg`,
        event_hosted_url: `${env.API_URL}/media/Badge/100-event-hosted.svg`,
        event_attended_url: `${env.API_URL}/media/Badge/100-event-attended.svg`,
        networks_url: `${env.API_URL}/media/Badge/100-networks.svg`,
        messages_url: `${env.API_URL}/media/Badge/100-messages.svg`,
        qr_url: `${env.API_URL}/media/Badge/100-qr.svg`,
    },
    {
        id: "f22a72a3-3844-4d7b-93d3-a640e6453ccb",
        event_count: "250",
        badge: "Bronze",
        title:"Connector in Action",
        priority: 5,
        locked_url: `${env.API_URL}/media/Badge/250-locked.svg`,
        event_hosted_url: `${env.API_URL}/media/Badge/250-event-hosted.svg`,
        event_attended_url: `${env.API_URL}/media/Badge/250-event-attended.svg`,
        networks_url: `${env.API_URL}/media/Badge/250-networks.svg`,
        messages_url: `${env.API_URL}/media/Badge/250-messages.svg`,
        qr_url: `${env.API_URL}/media/Badge/250-qr.svg`,
    },
    {
        id: "7dea3c41-60c7-4d16-a8ef-36776794d84b",
        event_count: "500",
        badge: "Gold",
        title:"Community Leader",
        priority: 6,
        locked_url: `${env.API_URL}/media/Badge/500-locked.svg`,
        event_hosted_url: `${env.API_URL}/media/Badge/500-event-hosted.svg`,
        event_attended_url: `${env.API_URL}/media/Badge/500-event-attended.svg`,
        networks_url: `${env.API_URL}/media/Badge/500-networks.svg`,
        messages_url: `${env.API_URL}/media/Badge/500-messages.svg`,
        qr_url: `${env.API_URL}/media/Badge/500-qr.svg`,
    },
    {
        id: "0289536b-4c95-4acd-9b8f-d6f032da1392",
        event_count: "1000",
        badge: "Light Gold",
        title:"Trusted Influencer",
        priority: 7,
        locked_url: `${env.API_URL}/media/Badge/1k-locked.svg`,
        event_hosted_url: `${env.API_URL}/media/Badge/1k-event-hosted.svg`,
        event_attended_url: `${env.API_URL}/media/Badge/1k-event-attended.svg`,
        networks_url: `${env.API_URL}/media/Badge/1k-networks.svg`,
        messages_url: `${env.API_URL}/media/Badge/1k-messages.svg`,
        qr_url: `${env.API_URL}/media/Badge/1k-qr.svg`,
    },
    {
        id: "97a77807-03fb-49c2-8914-787fad882c39",
        event_count: "2000",
        badge: "Purple Grey",
        title:"Elite Host",
        priority: 8,
        locked_url: `${env.API_URL}/media/Badge/2k-locked.svg`,
        event_hosted_url: `${env.API_URL}/media/Badge/2k-event-hosted.svg`,
        event_attended_url: `${env.API_URL}/media/Badge/2k-event-attended.svg`,
        networks_url: `${env.API_URL}/media/Badge/2k-networks.svg`,
        messages_url: `${env.API_URL}/media/Badge/2k-messages.svg`,
        qr_url: `${env.API_URL}/media/Badge/2k-qr.svg`,
    },
    {
        id: "20eacb85-0fb4-49bd-9c15-4b926d56129c",
        event_count: "5000",
        badge: "Silver",
        title:"Master Organizer",
        priority: 9,
        locked_url: `${env.API_URL}/media/Badge/2k-locked.svg`,
        event_hosted_url: `${env.API_URL}/media/Badge/5k-event-hosted.svg`,
        event_attended_url: `${env.API_URL}/media/Badge/5k-event-attended.svg`,
        networks_url: `${env.API_URL}/media/Badge/5k-networks.svg`,
        messages_url: `${env.API_URL}/media/Badge/5k-messages.svg`,
        qr_url: `${env.API_URL}/media/Badge/5k-qr.svg`,
    },
    {
        id: "91714f68-dcc4-40db-858e-3f3d21dbb2b6",
        event_count: "10000",
        badge: "Gold-Platinum",
        title:"legacy Builder",
        priority: 10,
        locked_url: `${env.API_URL}/media/Badge/10k-locked.svg`,
        event_hosted_url: `${env.API_URL}/media/Badge/10k-event-hosted.svg`,
        event_attended_url: `${env.API_URL}/media/Badge/10k-event-attended.svg`,
        networks_url: `${env.API_URL}/media/Badge/10k-networks.svg`,
        messages_url: `${env.API_URL}/media/Badge/10k-messages.svg`,
        qr_url: `${env.API_URL}/media/Badge/10k-qr.svg`,
    }
];