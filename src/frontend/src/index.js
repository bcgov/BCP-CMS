import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "@bcgov/bc-sans/css/BCSans.css";
import "@bcgov/bootstrap-theme/dist/css/bootstrap-theme.min.css";
import "./components/page.css";

import axios from "axios";
import { BrowserRouter } from "react-router-dom";
import { createMuiTheme, ThemeProvider } from "@material-ui/core";

if (window.REACT_APP_API_BASE_URL) {
  axios.defaults.baseURL = window.REACT_APP_API_BASE_URL;
} else if (process.env.REACT_APP_API_BASE_URL) {
  axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL;
}

const theme = createMuiTheme({ typography: { fontFamily: "BCSans" } });

ReactDOM.render(
  <ThemeProvider theme={theme}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeProvider>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
