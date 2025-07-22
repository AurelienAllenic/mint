// app/create-race.tsx
import UserRacesList from "@/components/SeeRaces/SeeRaces";
import { useAuth } from "../../context/auth";

export default function SeeRacesPage({
  onCloseMenu,
}: {
  onCloseMenu?: () => void;
}) {
  // Tu peux récupérer l'user via ton contexte
  const { user } = useAuth();

  return <UserRacesList user={user} onCloseMenu={onCloseMenu} />;
}
