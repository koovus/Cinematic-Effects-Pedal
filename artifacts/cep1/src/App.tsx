import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PedalBoard from "@/pages/PedalBoard";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={PedalBoard} />
      <Route path="*" component={PedalBoard} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
