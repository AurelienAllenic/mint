// app/create-race.tsx
import UserRacesList from "@/components/SeeRaces/SeeRaces";
import { useAuth } from "../../context/auth";

export default function SeeRacesPage() {
  // Tu peux récupérer l'user via ton contexte
  const { user } = useAuth();

  return <UserRacesList user={user} />;
}
