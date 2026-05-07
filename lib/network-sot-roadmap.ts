export type SotPhaseStatus = "done" | "in_progress" | "pending";

export type SotPhaseItem = {
  title: string;
  status: SotPhaseStatus;
  details: string;
};

export const NETWORK_SOT_ROADMAP: SotPhaseItem[] = [
  {
    title: "Phase 1 - Workspace Foundation",
    status: "done",
    details: "Tambah workspace Topology dan As-Built, struktur submenu, serta baseline tracking progres implementasi.",
  },
  {
    title: "Phase 2 - Connectivity Data Model",
    status: "in_progress",
    details: "Finalisasi model port, cable, core, splice/termination agar relasi konektivitas fiber bisa ditelusuri end-to-end.",
  },
  {
    title: "Phase 3 - Trace & Validation Engine",
    status: "pending",
    details: "Implement trace path A-Z, validasi orphan core, mismatch termination, dan warning kualitas data jaringan.",
  },
  {
    title: "Phase 4 - As-Built Drawing Output",
    status: "pending",
    details: "Generate visual skematik/topologi dan export PNG/PDF sebagai output as-built drawing design.",
  },
  {
    title: "Phase 5 - Planned vs As-Built",
    status: "pending",
    details: "Versioning perubahan desain dan komparasi planned versus as-built untuk kontrol perubahan lapangan.",
  },
];
