import { AppRouter } from "./router/AppRouter";
import { ThemeFloatingToggle } from "./components/ThemeFloatingToggle";

export default function App() {
  return (
    <>
      <AppRouter />
      <ThemeFloatingToggle />
    </>
  );
}
