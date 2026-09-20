export default function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="font-display text-xl text-ink">CRoom</p>
          <p className="mt-1 text-sm text-sage">Founded by Chakar Randhawa</p>
        </div>
        <p className="text-sm text-sage">
          Calls travel peer-to-peer. We never store your video, audio, or chat.
        </p>
      </div>
    </footer>
  );
}
