import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/crm/actions";

export default async function ContactsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id,first_name,last_name,email,phone,is_private_customer,updated_at")
    .order("last_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Contacts</h1>
          <p className="mt-1 text-sm text-zinc-600">Manage CRM contacts.</p>
        </div>
        <Link
          href="/app/contacts/new"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New contact
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {(contacts as
              | Pick<
                  Contact,
                  | "id"
                  | "first_name"
                  | "last_name"
                  | "email"
                  | "phone"
                  | "is_private_customer"
                  | "updated_at"
                >[]
              | null)?.map((contact) => (
              <tr key={contact.id}>
                <td className="px-4 py-3">
                  <Link className="font-medium text-zinc-900 hover:underline" href={`/app/contacts/${contact.id}`}>
                    {contact.first_name} {contact.last_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{contact.email ?? "-"}</td>
                <td className="px-4 py-3 text-zinc-600">{contact.phone ?? "-"}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {contact.is_private_customer ? "Private" : "Business"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contacts?.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600">No contacts yet.</p>
        ) : null}
      </div>
    </section>
  );
}
