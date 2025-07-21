// app/create-race.tsx
import CreateRace from "@/components/CreateRace/CreateRace";
import { useAuth } from "../../context/auth";

export default function CreateRacePage() {
  // Tu peux récupérer l'user via ton contexte
  const { user } = useAuth();

  return <CreateRace user={user} />;
}
