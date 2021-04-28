import React, { useState } from "react";
import { BrowserRouter, Switch, Route, Redirect } from "react-router-dom";
import Home from "../components/page/home/Home";
import Error from "../components/page/error/Error";
import AdvisoryDashboard from "../components/page/advisoryDashboard/AdvisoryDashboard";
import CreateAdvisory from "../components/page/createAdvisory/CreateAdvisory";
import UpdateAdvisory from "../components/page/updateAdvisory/UpdateAdvisory";

function AppRouter() {
  const [error, setError] = useState({});
  return (
    <div>
      <BrowserRouter>
        <Switch>
          <Redirect exact from="/" to="/bcparks" />
          <Route exact path="/bcparks">
            <Home page={{ setError }} />
          </Route>
          <Route path="/bcparks/advisory-dash">
            <AdvisoryDashboard page={{ setError }} />
          </Route>
          <Route path="/bcparks/create-advisory">
            <CreateAdvisory page={{ setError }} />
          </Route>
          <Route path="/bcparks/update-advisory/:id">
            <UpdateAdvisory page={{ setError }} />
          </Route>
          <Route path="/bcparks/error">
            <Error page={{ error }} />
          </Route>
        </Switch>
      </BrowserRouter>
    </div>
  );
}

export default AppRouter;
