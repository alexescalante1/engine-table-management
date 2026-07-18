import { redirect } from "next/navigation";

// La home del ejemplo lleva directo al panel admin (la base UI/UX navegable).
export default function Home() {
  redirect("/admin");
}
