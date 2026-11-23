import { RouterProvider } from "react-router-dom";
import root from "./router/root";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import queryClient from "./util/queryClient";

function App() {
  return <QueryClientProvider client={queryClient}>
    <RouterProvider router={root} />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>;
}

export default App;
