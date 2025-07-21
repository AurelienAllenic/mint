// app/create-race.tsx
import CreateOrganisation from "@/components/CreateOrganisation/CreateOrganisation";
import { useAuth } from "../../context/auth";

export default function CreateOrganisationPage() {
  // Tu peux récupérer l'user via ton contexte
  const { user } = useAuth();

  return <CreateOrganisation user={user} />;
}
