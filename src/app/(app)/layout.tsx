// Standard page width for the members' area and account pages. The editable
// site pages (welcome, about, ...) are full width and live outside this group.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <div className="mx-auto w-full max-w-5xl px-4 py-10">{children}</div>;
}
