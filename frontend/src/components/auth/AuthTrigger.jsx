import ScrollShowcase from "./ScrollShowcase";

export default function AuthTrigger({ onClick }) {
  return <ScrollShowcase onOpenAuth={onClick} />;
}