import { saveUser } from "../src/lib/auth";
import { saveProject } from "../src/lib/repo";
import type { NetreeUser, Project } from "../src/lib/types";

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
    scholar_url: "",
    faculty_id: null,
    open_to_collaboration: false,
    created_at: now,
    updated_at: now,
  };

  await saveUser(student);

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

  process.stdout.write("Seeded demo student user (1RV22CS045) and project prj_aerial_vision successfully.\n");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
