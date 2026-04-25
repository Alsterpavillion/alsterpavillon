import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteContact, updateContact, type Company, type Contact } from "@/lib/crm/actions";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: contact, error: contactError }, { data: companies, error: companiesError }] =
    await Promise.all([
      supabase.from("contacts").select("*").eq("id", id).single(),
      supabase.from("companies").select("id,name").order("name", { ascending: true }),
    ]);

  if (contactError || !contact) {
    notFound();
  }
  if (companiesError) {
    throw new Error(companiesError.message);
  }

  const typedContact = contact as Contact;
  const updateAction = updateContact.bind(null, typedContact.id);
  const deleteAction = deleteContact.bind(null, typedContact.id);

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <Link href="/app/contacts" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to contacts
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">
          {typedContact.first_name} {typedContact.last_name}
        </h1>
      </div>

      <form action={updateAction} className="space-y-4 rounded border border-zinc-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">First name</span>
            <input
              name="first_name"
              required
              maxLength={120}
              defaultValue={typedContact.first_name}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Last name</span>
            <input
              name="last_name"
              required
              maxLength={120}
              defaultValue={typedContact.last_name}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Company</span>
          <select
            name="company_id"
            defaultValue={typedContact.company_id ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          >
            <option value="">No company</option>
            {(companies as Pick<Company, "id" | "name">[] | null)?.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Email</span>
            <input
              name="email"
              type="email"
              maxLength={320}
              defaultValue={typedContact.email ?? ""}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Phone</span>
            <input
              name="phone"
              maxLength={80}
              defaultValue={typedContact.phone ?? ""}
              className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            name="is_private_customer"
            type="checkbox"
            defaultChecked={typedContact.is_private_customer}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Private customer
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Notes</span>
          <textarea
            name="notes"
            rows={5}
            maxLength={5000}
            defaultValue={typedContact.notes ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
          />
        </label>
        <div className="flex items-center justify-between gap-4">
          <button
            type="submit"
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Save contact
          </button>
          <span className="text-xs text-zinc-500">
            Created {new Date(typedContact.created_at).toLocaleDateString("de-DE")}
          </span>
        </div>
      </form>

      <form action={deleteAction}>
        <button type="submit" className="text-sm font-medium text-red-700 hover:text-red-900">
          Delete contact
        </button>
      </form>
    </section>
  );
}
