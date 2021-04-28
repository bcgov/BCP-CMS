"use strict";
const fs = require("fs");
const axios = require("axios");
const moment = require("moment");
const utf8 = require("utf8");

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/developer-docs/latest/concepts/configurations.html#bootstrap
 */
const loadParData = async () => {
  const currentProtectedAreas = await strapi.services["protected-area"].find();
  if (currentProtectedAreas.length == 0) {
    strapi.log.info("Loading Protected Areas data..");
    axios
      .get("https://a100.gov.bc.ca/pub/parws/protectedLands", {
        params: {
          protectedLandName: "%",
          protectedLandTypeCodes: "CS,ER,PA,PK,RA",
        },
      })
      .then((response) => {
        const protectedAreas = response.data.data;
        return Promise.resolve(
          protectedAreas.forEach((protectedArea) => {
            loadProtectedLandData(protectedArea);
          })
        );
      })
      .catch((error) => {
        strapi.log.error(error);
      });
  }
};

const loadRegion = async (area) => {
  const region = await Promise.resolve(
    strapi.services["region"].create({
      RegionNumber: area.protectedLandRegionNumber,
      RegionName: area.protectedLandRegionName,
    })
  )
    .catch(() => {
      return Promise.resolve(
        strapi.query("region").findOne({
          RegionNumber: area.protectedLandRegionNumber,
        })
      );
    })
    .finally(() => {});
  return region;
};

const loadSection = async (area, region) => {
  const section = await Promise.resolve(
    strapi.services["section"].create({
      SectionNumber: area.protectedLandSectionNumber,
      SectionName: area.protectedLandSectionName,
      Region: region,
    })
  )
    .catch(() => {
      return Promise.resolve(
        strapi.query("section").findOne({
          SectionNumber: area.protectedLandSectionNumber,
        })
      );
    })
    .finally(() => {});
  return section;
};

const loadManagementArea = async (area, region, section) => {
  const managementArea = await Promise.resolve(
    strapi.services["management-area"].create({
      ManagementAreaNumber: area.protectedLandManagementAreaNumber,
      ManagementAreaName: area.protectedLandManagementAreaName,
      Section: section,
      Region: region,
    })
  )
    .catch(() => {
      return Promise.resolve(
        strapi.query("management-area").findOne({
          ManagementAreaNumber: area.protectedLandManagementAreaNumber,
        })
      );
    })
    .finally(() => {});
  return managementArea;
};

const loadManagementAreaWithRelations = async (area) => {
  const region = await loadRegion(area);
  const section = await loadSection(area, region);
  const managementArea = await loadManagementArea(area, region, section);
  return managementArea;
};

const loadManagementAreas = async (managementAreas) => {
  const promises = managementAreas.map((area) =>
    loadManagementAreaWithRelations(area)
  );
  const managementAreasObj = await Promise.all(promises);
  return managementAreasObj;
};

const loadSite = async (site, orcNumber) => {
  const siteObj = await Promise.resolve(
    strapi.services["site"].create({
      ORCSSiteNumber: orcNumber + "-" + site.protectedLandSiteNumber,
      SiteNumber: site.protectedLandSiteNumber,
      SiteName: site.protectedLandSiteName,
      Status: site.protectedLandSiteStatusCode,
      EstablishedDate: site.protectedLandSiteEstablishedDate
        ? moment(site.protectedLandSiteEstablishedDate, "YYYY-MM-DD")
            .tz("UTC")
            .format()
        : null,
      RepealedDate: site.protectedLandSiteCanceledDate
        ? moment(site.protectedLandSiteCanceledDate, "YYYY-MM-DD")
            .tz("UTC")
            .format()
        : null,
      URL: "",
      Latitude: "",
      Longitude: "",
      MapZoom: "",
    })
  )
    .catch(() => {
      return Promise.resolve(
        strapi.query("site").findOne({
          ORCSSiteNumber: orcNumber + "-" + site.protectedLandSiteNumber,
        })
      );
    })
    .finally(() => {});
  return siteObj;
};

const loadSites = async (sites, orcNumber) => {
  const promises = sites.map((site) => loadSite(site, orcNumber));
  const sitesObj = await Promise.all(promises);
  return sitesObj;
};

const loadProtectedLandData = async (protectedLandData) => {
  try {
    const managementAreas = await loadManagementAreas(
      protectedLandData.managementAreas
    );
    const sites = await loadSites(
      protectedLandData.sites,
      protectedLandData.orcNumber
    );
    await strapi.services["protected-area"].create({
      ORCS: protectedLandData.orcNumber,
      ProtectedAreaName: utf8.encode(protectedLandData.protectedLandName),
      TotalArea: protectedLandData.totalArea,
      UplandArea: protectedLandData.uplandArea,
      MarineArea: protectedLandData.marineArea,
      MarineProtectedArea: protectedLandData.marineProtectedAreaInd,
      Type: protectedLandData.protectedLandTypeDescription,
      TypeCode: protectedLandData.protectedLandTypeCode,
      Class: protectedLandData.protectedLandClassCode,
      Status: protectedLandData.protectedLandStatusCode,
      EstablishedDate: protectedLandData.establishedDate
        ? moment(protectedLandData.establishedDate, "YYYY-MM-DD")
            .tz("UTC")
            .format()
        : null,
      RepealedDate: null,
      URL: "",
      Latitude: "",
      Longitude: "",
      MapZoom: "",
      Sites: [...sites],
      ManagementAreas: [...managementAreas],
    });
  } catch (error) {
    strapi.log.error(error);
  }
};

const createApiUser = async () => {
  const authRole = await findRole("authenticated");
  const password = await strapi.admin.services.auth.hashPassword(
    process.env.API_USER_PASSWORD
  );
  const apiUser = await Promise.resolve(
    strapi.query("user", "users-permissions").create({
      username: process.env.API_USER_NAME,
      email: process.env.API_USER_EMAIL,
      password: password,
      provider: "local",
      confirmed: true,
      blocked: false,
      role: authRole,
    })
  );
  return apiUser;
};

const createApiToken = async () => {
  try {
    const apiUser = await createApiUser();
    Promise.resolve(
      strapi.services["token"].create({
        Token: process.env.API_TOKEN,
        User: apiUser,
      })
    );
  } catch (error) {
    strapi.log.error(error);
  }
};

const loadPublicAdvisory = async () => {
  const modelName = "public-advisory";
  const loadSetting = await getDataLoadSetting(modelName);

  if (loadSetting && loadSetting.purge)
    await strapi.services[modelName].delete();

  if (loadSetting && !loadSetting.reload) return;

  const currentData = await strapi.services[modelName].find();
  if (currentData.length === 0) {
    strapi.log.info(`loading ${modelName}...`);
    var jsonData = fs.readFileSync("./data/public-advisory.json", "utf8");
    const dataSeed = JSON.parse(jsonData)[modelName];

    var jsonData = fs.readFileSync("./data/public-advisory-xref.json", "utf8");
    const dataXref = JSON.parse(jsonData);

    dataSeed.map(async (data) => {
      const orcsXref = await dataXref["public-advisory-xref"].filter(
        (x) => x.AdvisoryNumber == data.AdvisoryNumber
      );

      let orcs = [];
      await Promise.all(
        orcsXref.map(async (o) => {
          const orc = await strapi
            .query("protected-area")
            .find({ ORCS: o.ORCS });
          orcs = [...orcs, ...orc];
        })
      );
      data.protected_areas = orcs;

      data.access_status = await strapi
        .query("access-status")
        .findOne({ AccessStatus: data.AccessStatus });

      data.advisory_status = await strapi
        .query("advisory-status")
        .findOne({ AdvisoryStatus: data.AdvisoryStatus });

      data.event_type = await strapi
        .query("event-type")
        .findOne({ EventType: data.EventType });

      data.urgency = await strapi
        .query("urgency")
        .findOne({ Urgency: data.Urgency });

      data.DCTicketNumber = +data.DCTicketNumber;
      data.ListingRank = +data.ListingRank;
      data.Latitude = +data.Latitude;
      data.Longitude = +data.Longitude;
      data.MapZoom = +data.MapZoom;
      data.AdvisoryDate = data.AdvisoryDate
        ? moment(data.AdvisoryDate, "YYYY-MM-DD").tz("UTC").format()
        : null;
      data.EffectiveDate = data.EffectiveDate
        ? moment(data.EffectiveDate, "YYYY-MM-DD").tz("UTC").format()
        : null;
      data.EndDate = data.EndDate
        ? moment(data.EndDate, "YYYY-MM-DD").tz("UTC").format()
        : null;
      data.ExpiryDate = data.ExpiryDate
        ? moment(data.ExpiryDate, "YYYY-MM-DD").tz("UTC").format()
        : null;
      data.RemovalDate = data.RemovalDate
        ? moment(data.RemovalDate, "YYYY-MM-DD").tz("UTC").format()
        : null;
      data.UpdatedDate = data.UpdatedDate
        ? moment(data.UpdatedDate, "YYYY-MM-DD").tz("UTC").format()
        : null;
      data.DisplayAdvisoryDate = data.DisplayAdvisoryDate
        ? moment(data.DisplayAdvisoryDate, "YYYY-MM-DD").tz("UTC").format()
        : null;
      data.CreatedDate = data.CreatedDate
        ? moment(data.CreatedDate, "YYYY-MM-DD").tz("UTC").format()
        : null;
      data.ModifiedDate = data.ModifiedDate
        ? moment(data.ModifiedDate, "YYYY-MM-DD").tz("UTC").format()
        : null;
      await strapi.services[modelName].create(data);
    });
  }
};

const loadFireZone = async () => {
  const currentData = await strapi.services["fire-zone"].find();
  if (currentData.length == 0) {
    strapi.log.info("loading fire zone...");
    var jsonData = fs.readFileSync("./data/fire-zone.json", "utf8");
    const dataSeed = JSON.parse(jsonData)["fire-zone"];
    dataSeed.forEach(async (data) => {
      data.fire_centre = await strapi.services["fire-centre"].findOne({
        FireCentreNumber: data.FireCentreNumber,
      });
      strapi.services["fire-zone"].create(data);
    });
  }
};

const loadParkActivityXref = async () => {
  strapi.log.info("loading park activity xref...");
  var jsonData = fs.readFileSync("./data/park-activity-xref.json", "utf8");
  const dataSeed = JSON.parse(jsonData)["park-activity-xref"];

  const xrefs = Object.entries(
    dataSeed.reduce((acc, { ORCS, ActivityID }) => {
      acc[ORCS] = [...(acc[ORCS] || []), { ActivityID }];
      return acc;
    }, {})
  ).map(([key, value]) => ({ ORCS: key, ActivityID: value }));

  for (const xref of xrefs) {
    const protectedArea = await strapi.services["protected-area"].findOne({
      ORCS: xref.ORCS,
    });
    if (protectedArea) {
      let activities = [];
      for (const item of xref.ActivityID) {
        const activity = await strapi.services["activity"].findOne({
          ActivityNumber: item.ActivityID,
        });
        activities = [...activities, activity];
      }

      if (activities.length > 0) {
        protectedArea.activities = activities;
        strapi
          .query("protected-area")
          .update({ id: protectedArea.id }, protectedArea);
      }
    }
  }
};

const loadParkFacilityXref = async () => {
  strapi.log.info("loading park facility xref...");
  var jsonData = fs.readFileSync("./data/park-facility-xref.json", "utf8");
  const dataSeed = JSON.parse(jsonData)["park-facility-xref"];

  const xrefs = Object.entries(
    dataSeed.reduce((acc, { ORCS, FacilityID }) => {
      acc[ORCS] = [...(acc[ORCS] || []), { FacilityID }];
      return acc;
    }, {})
  ).map(([key, value]) => ({ ORCS: key, FacilityID: value }));

  for (const xref of xrefs) {
    const protectedArea = await strapi.services["protected-area"].findOne({
      ORCS: xref.ORCS,
    });
    if (protectedArea) {
      let facilities = [];
      for (const item of xref.FacilityID) {
        const facility = await strapi.services["facility"].findOne({
          FacilityNumber: item.FacilityID,
        });
        facilities = [...facilities, facility];
      }

      if (facilities.length > 0) {
        protectedArea.facilities = facilities;
        strapi
          .query("protected-area")
          .update({ id: protectedArea.id }, protectedArea);
      }
    }
  }
};

const loadParkFireZoneXref = async () => {
  strapi.log.info("loading park fire zone xref...");
  var jsonData = fs.readFileSync("./data/park-fire-zone-xref.json", "utf8");
  const dataSeed = JSON.parse(jsonData)["park-fire-zone-xref"];

  const parkFireZoneXref = Object.entries(
    dataSeed.reduce((acc, { ORCS, FireZoneNumber }) => {
      acc[ORCS] = [...(acc[ORCS] || []), { FireZoneNumber }];
      return acc;
    }, {})
  ).map(([key, value]) => ({ ORCS: key, FireZoneNumber: value }));

  for (const parkXref of parkFireZoneXref) {
    const protectedArea = await strapi.services["protected-area"].findOne({
      ORCS: parkXref.ORCS,
    });
    if (protectedArea) {
      let fireZones = [];
      for (const item of parkXref.FireZoneNumber) {
        const fireZone = await strapi.services["fire-zone"].findOne({
          FireZoneNumber: item.FireZoneNumber,
        });
        fireZones = [...fireZones, fireZone];
      }

      if (fireZones.length > 0) {
        protectedArea.fire_zones = fireZones;
        strapi
          .query("protected-area")
          .update({ id: protectedArea.id }, protectedArea);
      }
    }
  }
};

const loadParkFogZoneXref = async () => {
  strapi.log.info("loading park fog zone xref...");
  var jsonData = fs.readFileSync("./data/park-fog-zone-xref.json", "utf8");
  const dataSeed = JSON.parse(jsonData)["park-fog-zone-xref"];
  for (const data of dataSeed) {
    const protectedArea = await strapi.services["protected-area"].findOne({
      ORCS: data.ORCS,
    });
    if (protectedArea) {
      protectedArea.FogZone = data.FogZone === "Y" ? true : false;

      strapi
        .query("protected-area")
        .update({ id: protectedArea.id }, protectedArea);
    }
  }
};

const getDataLoadSetting = async (modelName) => {
  const loadSetting = await strapi
    .query("data-load-setting")
    .findOne({ model: modelName });

  let message = {
    model: modelName,
    reload: null,
    purge: null,
  };

  if (loadSetting) {
    message.reload = loadSetting.reload;
    message.purge = loadSetting.purge;
  }

  strapi.log.info("pre-load config", message);
  return loadSetting;
};

const isFirstRun = async () => {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: "type",
    name: "setup",
  });
  const initHasRun = await pluginStore.get({ key: "initHasRun" });
  await pluginStore.set({ key: "initHasRun", value: true });
  return !initHasRun;
};

const setDefaultPermissions = async () => {
  const authRole = await findRole("authenticated");

  const authPermissions = await strapi
    .query("permission", "users-permissions")
    .find({ type: "application", role: authRole.id });

  await Promise.all(
    authPermissions.map((p) =>
      strapi
        .query("permission", "users-permissions")
        .update({ id: p.id }, { enabled: true })
    )
  );

  const publicRole = await findRole("public");

  const publicPermissions = await strapi
    .query("permission", "users-permissions")
    .find({
      type: "application",
      role: publicRole.id,
      action_in: ["find", "findone"],
    });

  await Promise.all(
    publicPermissions.map((p) =>
      strapi
        .query("permission", "users-permissions")
        .update({ id: p.id }, { enabled: true })
    )
  );
};

const findRole = async (role) => {
  const result = await strapi
    .query("role", "users-permissions")
    .findOne({ type: role });
  return result;
};

const loadBusinessHours = async () => {
  strapi.log.info("Loading Business hours..");
  try {
    var jsonData = fs.readFileSync("./data/business-hours.json", "utf8");
    const data = JSON.parse(jsonData);
    strapi.services["business-hours"].createOrUpdate(data);
  } catch (error) {
    strapi.log.error(error);
  }
};

const loadStatutoryHolidays = async () => {
  try {
    strapi.log.info("Setting Empty Statutory Holidays..");
    const data = JSON.parse({});
    strapi.services["statutory-holidays"].createOrUpdate(data);
  } catch (error) {
    strapi.log.error(error);
  }
};

const createAdmin = async () => {
  try {
    if (process.env.NODE_ENV === "development") {
      const params = {
        username: process.env.ADMIN_USER,
        password: process.env.ADMIN_PASSWORD,
        firstname: process.env.ADMIN_FIRST_NAME,
        lastname: process.env.ADMIN_LAST_NAME,
        email: process.env.ADMIN_EMAIL,
        blocked: false,
        isActive: true,
      };
      //Check if any account exists.
      const admins = await strapi.query("user", "admin").find();

      if (admins.length === 0) {
        let verifyRole = await strapi
          .query("role", "admin")
          .findOne({ code: "strapi-super-admin" });
        if (!verifyRole) {
          verifyRole = await strapi.query("role", "admin").create({
            name: "Super Admin",
            code: "strapi-super-admin",
            description:
              "Super Admins can access and manage all features and settings.",
          });
        }
        params.roles = [verifyRole.id];
        params.password = await strapi.admin.services.auth.hashPassword(
          params.password
        );
        await strapi.query("user", "admin").create({
          ...params,
        });
        strapi.log.info("Admin account was successfully created.");
        strapi.log.info(`Email: ${params.email}`);
      }
    }
  } catch (error) {
    strapi.log.error(`Couldn't create Admin account during bootstrap: `, error);
  }
};

const loadJsonData = async (model, jsonFile, object) => {
  try {
    const loadSetting = await getDataLoadSetting(model);

    if (loadSetting && loadSetting.purge) await strapi.services[model].delete();

    if (loadSetting && !loadSetting.reload) return;

    const currentData = await strapi.services[model].find();
    if (currentData.length == 0) {
      strapi.log.info(`loading ${model}...`);
      var jsonData = fs.readFileSync(jsonFile, "utf8");
      const dataSeed = JSON.parse(jsonData)[object];

      dataSeed.forEach((data) => {
        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
          if (data[keys[i]] === "") data[keys[i]] = null;
        }

        strapi.services[model].create(data);
      });
    }
  } catch (error) {
    strapi.log.error(`error loading ${model}...`);
    strapi.log.error(error);
  }
};

const loadData = async () => {
  try {
    await loadParData();
    await createApiToken();
    await loadBusinessHours();
    await loadStatutoryHolidays();
    await loadJsonData(
      "access-status",
      "./data/access-status.json",
      "access-status"
    );
    await loadJsonData(
      "advisory-status",
      "./data/advisory-status.json",
      "advisory-status"
    );
    await loadJsonData("event-type", "./data/event-type.json", "event-type");
    await loadJsonData("fire-centre", "./data/fire-centre.json", "fire-centre");
    await loadJsonData(
      "activity",
      "./data/park-activity.json",
      "park-activity"
    );
    await loadJsonData(
      "facility",
      "./data/park-facility.json",
      "park-facility"
    );
    await loadJsonData("urgency", "./data/urgency.json", "urgency");

    await loadFireZone();
    await loadPublicAdvisory();
    await loadParkActivityXref();
    await loadParkFacilityXref();
    await loadParkFireZoneXref();
    await loadParkFogZoneXref();
  } catch (error) {
    strapi.log.error(error);
  }
};

module.exports = async () => {
  // Load data and set default public roles on first run
  const setupCMS = await isFirstRun();
  if (setupCMS) {
    await createAdmin();
    await setDefaultPermissions();
    await loadData();
  }
};
