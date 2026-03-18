import { AppRouter } from "./router/AppRouter";
import { ThemeFloatingToggle } from "./components/ThemeFloatingToggle";
import { AppToastContainer } from "./components/AppToastContainer";

export default function App() {
  return (
    <>
      <AppRouter />
      <ThemeFloatingToggle />
      <AppToastContainer />
    </>
  );
}
