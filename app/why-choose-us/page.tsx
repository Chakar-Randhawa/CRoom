import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const rows = [
  {
    feature: "Where your video and audio travel",
    croom: "Directly between browsers (peer-to-peer)",
    typical: "Routed through the provider's servers",
  },
  {
    feature: "Call recordings",
    croom: "Never created",
    typical: "Often stored by default",
  },
  {
    feature: "Account data required",
    croom: "Email, password, display name only",
    typical: "Phone number, contacts, device IDs",
  },
  {
    feature: "Room link privacy",
    croom: "Room code lives only in the URL fragment — never sent to a server",
    typical: "Room IDs logged in server access logs",
  },
  {
    feature: "Behavior on a weak connection",
    croom: "Automatically downgrades video, then drops to audio-only",
    typical: "Call freezes or disconnects",
  },
  {
    feature: "Chat messages",
    croom: "Sent over a direct WebRTC data channel",
    typical: "Stored in a message database",
  },
];

export default function WhyChooseUsPage() {
  return (
    <AuthGuard>
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
        <h1 className="font-display text-4xl text-ink">Why choose CRoom</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/70">
          Most video calling products route your media through their infrastructure because it's
          simpler to build. CRoom is built the harder way, so that infrastructure never has your
          call to begin with.
        </p>

        <div className="mt-10 overflow-x-auto rounded-tile border border-hairline shadow-tile">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline bg-white">
                <th className="px-5 py-4 font-semibold text-ink">Feature</th>
                <th className="px-5 py-4 font-semibold text-pine">CRoom</th>
                <th className="px-5 py-4 font-semibold text-sage">Typical platforms</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? "bg-paper" : "bg-white"}>
                  <td className="px-5 py-4 align-top font-medium text-ink">{row.feature}</td>
                  <td className="px-5 py-4 align-top text-ink/80">{row.croom}</td>
                  <td className="px-5 py-4 align-top text-sage">{row.typical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-14 grid gap-6 sm:grid-cols-3">
          <InfraCard
            title="Low overhead"
            body="With no media servers relaying every call, infrastructure costs stay near-zero regardless of how many calls happen at once."
          />
          <InfraCard
            title="Fewer failure points"
            body="A call that doesn't depend on a media server can't be taken down by that server having a bad day."
          />
          <InfraCard
            title="Runs on modest hardware"
            body="The calling engine adapts resolution and bitrate in real time, so it stays usable on older phones and slower connections."
          />
        </section>
      </main>
      <Footer />
    </AuthGuard>
  );
}

function InfraCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-tile border border-hairline bg-white p-5 shadow-tile">
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-sage">{body}</p>
    </div>
  );
}
