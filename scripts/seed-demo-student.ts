import { putRecord } from "../src/lib/store/records";
import { saveProject, saveQuestion } from "../src/lib/repo";
import type { NetreeUser, Project, Question } from "../src/lib/types";

async function saveUserDirect(user: NetreeUser) {
  await putRecord("app_user", {
    id: user.user_id,
    owner_id: user.user_id,
    ref_id: user.faculty_id ?? "",
    status: user.role,
    payload: user as unknown as Record<string, unknown>,
  });
}

async function main() {
  const now = new Date().toISOString();

  const student: NetreeUser = {
    user_id: "usr_aditya",
    role: "student",
    full_name: "Aditya Sharma",
    email: "aditya.sharma@rvce.edu.in",
    college_id: "1RV22CS045",
    department: "Computer Science and Engineering",
    standing: "6th Semester",
    bio: "Building edge computer vision systems and distributed AI architectures.",
    interests: ["Artificial Intelligence", "Computer Vision", "Edge Computing", "Cyber Security"],
    achievements: "Winner of Smart Campus Hackathon 2025",
    resume_name: "aditya_resume.txt",
    resume_text: "Undergraduate researcher in Computer Science at RVCE.",
    linkedin_url: "https://www.linkedin.com/in/aditya-sharma-rvce",
    scholar_url: "",
    faculty_id: null,
    open_to_collaboration: false,
    created_at: now,
    updated_at: now,
  };

  await saveUserDirect(student);

  const project: Project = {
    project_id: "prj_aerial_vision",
    owner_user_id: "usr_aditya",
    owner_name: "Aditya Sharma",
    title: "Aerial Crowd Density & Surveillance with Edge AI",
    status: "structured",
    transcript: [
      { role: "user", content: "I want to track crowd congestion from drone cameras on campus." },
      { role: "assistant", content: "What edge hardware and latency targets are you designing for?" },
      { role: "user", content: "Targeting an NVIDIA Jetson Orin Nano with sub-100ms inference." }
    ],
    brief: {
      title: "Aerial Crowd Density & Surveillance with Edge AI",
      one_liner: "Estimating real-time crowd density from low-altitude drone video using quantized lightweight vision models.",
      problem: "Campus security and large-scale event organizers lack real-time visibility into crowd bottlenecking before congestion turns dangerous.",
      approach: "Deploying quantized object detection models (YOLOv8-tiny) and ByteTrack on an edge device mounted on UAVs.",
      domain_tags: ["Computer Vision", "Video Surveillance", "Edge AI", "Object Tracking"],
      deliverables: ["Edge inference pipeline container", "Real-time density heatmap UI"],
      skills_have: ["Python", "PyTorch", "OpenCV"],
      skills_needed: ["TensorRT optimization", "UAV camera gimbal integration"],
      timeline: "4 months",
      resources: "Drone flight permissions, Jetson Orin Nano development kit",
      open_questions: ["How to handle camera jitter during windy outdoor flights?"]
    },
    match: null,
    created_at: now,
    updated_at: now,
  };

  await saveProject(project);

  const alumni: NetreeUser = {
    user_id: "usr_rohit_alumni",
    role: "alumni",
    full_name: "Rohit Menon",
    email: "rohit.menon@alumni.rvce.edu.in",
    college_id: "1RV18CS088",
    department: "Computer Science and Engineering",
    standing: "Class of 2022 · Staff Engineer @ Databricks",
    bio: "RVCE 2022 alumni. Specializing in distributed real-time systems, streaming architectures, and production ML pipelines.",
    interests: ["Distributed Systems", "Machine Learning", "Cloud Architecture", "Edge AI"],
    achievements: "Databricks Spark Contributor, RVCE Best Outgoing Student 2022",
    resume_name: "",
    resume_text: "",
    linkedin_url: "https://www.linkedin.com/in/rohit-menon-rvce",
    scholar_url: "",
    faculty_id: null,
    open_to_collaboration: true,
    created_at: now,
    updated_at: now,
  };

  await saveUserDirect(alumni);

  const question: Question = {
    question_id: "qst_edge_prod_advice",
    asker_user_id: "usr_aditya",
    asker_name: "Aditya Sharma",
    audience: "alumni",
    target_user_id: null,
    target_name: null,
    topic: "Production deployment for lightweight vision models on edge hardware",
    body: "Hi alumni mentors! I'm an undergrad working on quantized YOLOv8 models for real-time video surveillance. In industry, how do teams handle edge OTA updates and camera latency bottlenecks without burning power?",
    status: "open",
    answer: "",
    answered_by: null,
    created_at: now,
    updated_at: now,
  };

  await saveQuestion(question);

  process.stdout.write("Seeded student (1RV22CS045), alumni (1RV18CS088 / Rohit Menon), project, and open question successfully.\n");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
