import type { Course } from "@/lib/types"

const courseImages = [
  "https://media.istockphoto.com/id/1500285927/photo/young-woman-a-university-student-studying-online.jpg?s=1024x1024&w=is&k=20&c=CVhpekieDK_UB8vtEDw-dKKGWzDpsxcQt-XEQIkgm3Y=",
  "https://media.istockphoto.com/id/1290864946/photo/e-learning-education-concept-learning-online.jpg?s=1024x1024&w=is&k=20&c=jp1aegIi9CQLqGAOKPQbOHlEgsD_HtYgKoz4KCKRV18="
]

const mockCourses: Course[] = [
  {
    id: "1",
    title: "Introduction to Web Development",
    description:
      "Learn the fundamentals of web development including HTML, CSS, and JavaScript. This course is designed for beginners with no prior experience.",
    instructor: "John Doe",
    image: courseImages[0],
    level: "Beginner",
    duration: "8 weeks",
    students: 1245,
    createdAt: "Jan 15, 2025",
    updatedAt: "Mar 10, 2025",
    language: "English",
    certificate: true,
    learningOutcomes: [
      "Understand HTML structure and semantics",
      "Create responsive layouts with CSS",
      "Build interactive web pages with JavaScript",
      "Deploy websites to production",
      "Implement basic web accessibility",
      "Use developer tools for debugging",
    ],
    syllabus: [
      {
        title: "HTML Fundamentals",
        description: "Learn the basics of HTML markup and document structure",
        duration: "1 week",
        lessons: [
          { 
            title: "Introduction to HTML", 
            duration: "45 min",
            videoPath: "/video/HTML/HTML Crash Course In 30 Minutes.mp4"
          },
          { 
            title: "HTML Document Structure", 
            duration: "1 hour",
            videoPath: "/video/HTML/HTML Crash Course In 30 Minutes.mp4"
          },
          { 
            title: "HTML Elements and Attributes", 
            duration: "1.5 hours",
            videoPath: "/video/HTML/HTML Crash Course In 30 Minutes.mp4"
          },
          { 
            title: "HTML Forms", 
            duration: "1 hour",
            videoPath: "/video/HTML/HTML Crash Course In 30 Minutes.mp4"
          },
        ],
      },
      {
        title: "CSS Styling",
        description: "Learn how to style web pages with CSS",
        duration: "2 weeks",
        lessons: [
          { 
            title: "CSS Selectors", 
            duration: "1 hour",
            videoPath: "/video/CSS/CSS in 5 minutes.mp4"
          },
          { 
            title: "CSS Basics", 
            duration: "1.5 hours",
            videoPath: "/video/CSS/CSS in 5 minutes.mp4"
          },
          { 
            title: "CSS Layout", 
            duration: "2 hours",
            videoPath: "/video/CSS/CSS in 5 minutes.mp4"
          },
          { 
            title: "Responsive Design with CSS", 
            duration: "1.5 hours",
            videoPath: "/video/CSS/CSS in 5 minutes.mp4"
          },
        ],
      },
      {
        title: "JavaScript Basics",
        description: "Introduction to programming with JavaScript",
        duration: "3 weeks",
        lessons: [
          { 
            title: "Variables and Data Types in JavaScript", 
            duration: "1 hour",
            videoPath: "/video/JavaScript/Learn JAVASCRIPT in just 5 MINUTES (2020).mp4"
          },
          { 
            title: "JavaScript Functions", 
            duration: "1.5 hours",
            videoPath: "/video/JavaScript/Learn JAVASCRIPT in just 5 MINUTES (2020).mp4"
          },
          { 
            title: "DOM Manipulation with JavaScript", 
            duration: "2 hours",
            videoPath: "/video/JavaScript/Learn JAVASCRIPT in just 5 MINUTES (2020).mp4"
          },
          { 
            title: "JavaScript Events", 
            duration: "1.5 hours",
            videoPath: "/video/JavaScript/Learn JAVASCRIPT in just 5 MINUTES (2020).mp4"
          },
        ],
      },
    ],
    resources: [
      { title: "HTML Cheat Sheet", url: "#" },
      { title: "CSS Reference Guide", url: "#" },
      { title: "JavaScript Fundamentals PDF", url: "#" },
      { title: "Web Development Tools List", url: "#" },
    ],
  },
  {
    id: "2",
    title: "Advanced React Development",
    description:
      "Master React.js and build complex, state-driven applications. Learn hooks, context API, and advanced patterns.",
    instructor: "Jane Smith",
    image: courseImages[1],
    level: "Advanced",
    duration: "10 weeks",
    students: 843,
    createdAt: "Feb 5, 2025",
    updatedAt: "Mar 12, 2025",
    language: "English",
    certificate: true,
    learningOutcomes: [
      "Build complex React applications",
      "Implement state management with Redux",
      "Create custom hooks",
      "Optimize React performance",
      "Test React components",
      "Deploy React applications",
    ],
    syllabus: [
      {
        title: "React Fundamentals Review",
        description: "Quick review of React basics",
        duration: "1 week",
        lessons: [
          { title: "Components and Props", duration: "1 hour" },
          { title: "State and Lifecycle", duration: "1.5 hours" },
          { title: "Handling Events", duration: "1 hour" },
        ],
      },
      {
        title: "Advanced Hooks",
        description: "Deep dive into React hooks",
        duration: "2 weeks",
        lessons: [
          { title: "useState and useEffect", duration: "1 hour" },
          { title: "useContext and useReducer", duration: "1.5 hours" },
          { title: "Custom Hooks", duration: "2 hours" },
        ],
      },
    ],
    resources: [
      { title: "React Documentation", url: "#" },
      { title: "Advanced Patterns PDF", url: "#" },
      { title: "Performance Optimization Guide", url: "#" },
    ],
  },
  {
    id: "3",
    title: "Data Science Fundamentals",
    description:
      "Introduction to data science concepts, tools, and methodologies. Learn Python, data analysis, and visualization.",
    instructor: "Michael Johnson",
    image: courseImages[1],
    level: "Intermediate",
    duration: "12 weeks",
    students: 1567,
    createdAt: "Dec 10, 2024",
    updatedAt: "Mar 5, 2025",
    language: "English",
    certificate: true,
    learningOutcomes: [
      "Analyze data using Python",
      "Create data visualizations",
      "Apply statistical methods",
      "Build machine learning models",
      "Clean and preprocess data",
      "Present data insights",
    ],
    syllabus: [
      {
        title: "Python for Data Science",
        description: "Learn Python programming for data analysis",
        duration: "3 weeks",
        lessons: [
          { title: "Python Basics", duration: "1.5 hours" },
          { title: "NumPy and Pandas", duration: "2 hours" },
          { title: "Data Manipulation", duration: "2 hours" },
        ],
      },
      {
        title: "Data Visualization",
        description: "Create effective data visualizations",
        duration: "2 weeks",
        lessons: [
          { title: "Matplotlib and Seaborn", duration: "1.5 hours" },
          { title: "Interactive Visualizations", duration: "2 hours" },
          { title: "Dashboard Creation", duration: "2.5 hours" },
        ],
      },
    ],
    resources: [
      { title: "Python Data Science Handbook", url: "#" },
      { title: "Statistical Methods Guide", url: "#" },
      { title: "Visualization Best Practices", url: "#" },
    ],
  },
  {
    id: "4",
    title: "UX/UI Design Principles",
    description:
      "Learn the fundamentals of user experience and interface design. Create user-centered designs and prototypes.",
    instructor: "Sarah Williams",
    image: courseImages[0],
    level: "Beginner",
    duration: "8 weeks",
    students: 921,
    createdAt: "Jan 20, 2025",
    updatedAt: "Mar 8, 2025",
    language: "English",
    certificate: true,
    learningOutcomes: [
      "Apply UX research methods",
      "Create user personas and journeys",
      "Design wireframes and prototypes",
      "Conduct usability testing",
      "Apply design principles",
      "Create accessible designs",
    ],
    syllabus: [
      {
        title: "UX Research",
        description: "Learn user research methods and techniques",
        duration: "2 weeks",
        lessons: [
          { title: "User Research Methods", duration: "1.5 hours" },
          { title: "Creating User Personas", duration: "1 hour" },
          { title: "User Journey Mapping", duration: "1.5 hours" },
        ],
      },
      {
        title: "UI Design",
        description: "Learn interface design principles",
        duration: "3 weeks",
        lessons: [
          { title: "Design Principles", duration: "1 hour" },
          { title: "Color Theory and Typography", duration: "1.5 hours" },
          { title: "Layout and Composition", duration: "2 hours" },
        ],
      },
    ],
    resources: [
      { title: "UX Research Methods Guide", url: "#" },
      { title: "UI Design Patterns", url: "#" },
      { title: "Accessibility Guidelines", url: "#" },
    ],
  },
  {
    id: "5",
    title: "Cloud Computing with AWS",
    description:
      "Learn to design, deploy, and manage applications on Amazon Web Services. Master key AWS services and architecture.",
    instructor: "Robert Chen",
    image: courseImages[1],
    level: "Intermediate",
    duration: "10 weeks",
    students: 756,
    createdAt: "Feb 15, 2025",
    updatedAt: "Mar 15, 2025",
    language: "English",
    certificate: true,
    learningOutcomes: [
      "Design cloud architecture",
      "Deploy applications on AWS",
      "Implement security best practices",
      "Set up networking on AWS",
      "Use AWS database services",
      "Implement serverless architecture",
    ],
    syllabus: [
      {
        title: "AWS Fundamentals",
        description: "Introduction to AWS services and console",
        duration: "2 weeks",
        lessons: [
          { title: "AWS Console and IAM", duration: "1 hour" },
          { title: "EC2 and S3", duration: "2 hours" },
          { title: "VPC and Networking", duration: "1.5 hours" },
        ],
      },
      {
        title: "Serverless Computing",
        description: "Build serverless applications with AWS Lambda",
        duration: "3 weeks",
        lessons: [
          { title: "Lambda Functions", duration: "1.5 hours" },
          { title: "API Gateway", duration: "1 hour" },
          { title: "DynamoDB", duration: "1.5 hours" },
        ],
      },
    ],
    resources: [
      { title: "AWS Architecture Guide", url: "#" },
      { title: "Serverless Patterns", url: "#" },
      { title: "AWS Security Best Practices", url: "#" },
    ],
  },
  {
    id: "6",
    title: "Mobile App Development with Flutter",
    description:
      "Build cross-platform mobile applications with Flutter and Dart. Create beautiful, natively compiled apps for iOS and Android.",
    instructor: "Emily Rodriguez",
    image: courseImages[0],
    level: "Intermediate",
    duration: "12 weeks",
    students: 689,
    createdAt: "Jan 5, 2025",
    updatedAt: "Mar 10, 2025",
    language: "English",
    certificate: true,
    learningOutcomes: [
      "Build Flutter applications",
      "Design responsive UIs",
      "Implement state management",
      "Connect to APIs and databases",
      "Test and debug Flutter apps",
      "Deploy to app stores",
    ],
    syllabus: [
      {
        title: "Dart Programming",
        description: "Learn the Dart programming language",
        duration: "2 weeks",
        lessons: [
          { title: "Dart Basics", duration: "1.5 hours" },
          { title: "Object-Oriented Programming", duration: "2 hours" },
          { title: "Asynchronous Programming", duration: "1.5 hours" },
        ],
      },
      {
        title: "Flutter UI",
        description: "Build user interfaces with Flutter",
        duration: "3 weeks",
        lessons: [
          { title: "Widgets and Layout", duration: "2 hours" },
          { title: "Theming and Styling", duration: "1.5 hours" },
          { title: "Animations", duration: "2 hours" },
        ],
      },
    ],
    resources: [
      { title: "Flutter Documentation", url: "#" },
      { title: "UI Design Patterns", url: "#" },
      { title: "State Management Guide", url: "#" },
    ],
  },
]


const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchCourses(): Promise<Course[]> {
  const response = await fetch("/api/courses")
  if (!response.ok) {
    throw new Error("Failed to fetch courses")
  }
  return response.json()
}

export async function fetchCourseById(id: string): Promise<Course> {
  const response = await fetch(`/api/courses/${id}`)
  if (!response.ok) {
    throw new Error("Failed to fetch course")
  }
  return response.json()
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  return mockCourses.find((course) => course.id === id)
}

