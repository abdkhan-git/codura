import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SchoolSearchStep from "./SchoolSearchStep";
export default async function Page() {
	const supabase = await createClient();
	
	const { data: { user } } = await supabase.auth.getUser();
	
	if (!user) {
	  redirect("/login");
	}
  
	// Onboarding is now handled as a modal on the dashboard
	// Redirect everyone to dashboard
	redirect("/dashboard");
}