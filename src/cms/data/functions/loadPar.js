"use strict";
const axios = require("axios");
const moment = require("moment");
const utf8 = require("utf8");
const fs = require("fs");

const loadParData = async () => {
  const PAR_URL = "https://a100.gov.bc.ca/pub/parws/protectedLands";
  const currentProtectedAreas = await strapi.services["protected-area"].find();
  if (currentProtectedAreas.length == 0) {
    strapi.log.info("Loading Protected Areas data..");
    axios
      .get(PAR_URL, {
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

const loadAdditionalParData = async () => {
  await loadAdditionalProtectedAreaInfo();
  await loadAdditionalSiteInfo();
};

const loadRegion = async (area) => {
  const region = await Promise.resolve(
    strapi.services["region"].create({
      regionNumber: area.protectedLandRegionNumber,
      regionName: area.protectedLandRegionName,
    })
  )
    .catch(() => {
      return Promise.resolve(
        strapi.query("region").findOne({
          regionNumber: area.protectedLandRegionNumber,
        })
      );
    })
    .finally(() => {});
  return region;
};

const loadSection = async (area, region) => {
  const section = await Promise.resolve(
    strapi.services["section"].create({
      sectionNumber: area.protectedLandSectionNumber,
      sectionName: area.protectedLandSectionName,
      region: region,
    })
  )
    .catch(() => {
      return Promise.resolve(
        strapi.query("section").findOne({
          sectionNumber: area.protectedLandSectionNumber,
        })
      );
    })
    .finally(() => {});
  return section;
};

const loadManagementArea = async (area, region, section) => {
  const managementArea = await Promise.resolve(
    strapi.services["management-area"].create({
      managementAreaNumber: area.protectedLandManagementAreaNumber,
      managementAreaName: area.protectedLandManagementAreaName,
      section: section,
      region: region,
    })
  )
    .catch(() => {
      return Promise.resolve(
        strapi.query("management-area").findOne({
          managementAreaNumber: area.protectedLandManagementAreaNumber,
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
      orcsSiteNumber: orcNumber + "-" + site.protectedLandSiteNumber,
      siteNumber: site.protectedLandSiteNumber,
      siteName: site.protectedLandSiteName,
      status: site.protectedLandSiteStatusCode,
      establishedDate: site.protectedLandSiteEstablishedDate
        ? moment(site.protectedLandSiteEstablishedDate, "YYYY-MM-DD")
            .tz("UTC")
            .format()
        : null,
      repealedDate: site.protectedLandSiteCanceledDate
        ? moment(site.protectedLandSiteCanceledDate, "YYYY-MM-DD")
            .tz("UTC")
            .format()
        : null,
      url: "",
      latitude: null,
      longitude: null,
      mapZoom: null,
    })
  )
    .catch(() => {
      return Promise.resolve(
        strapi.query("site").findOne({
          orcsSiteNumber: orcNumber + "-" + site.protectedLandSiteNumber,
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
      orcs: protectedLandData.orcNumber,
      protectedAreaName: utf8.encode(protectedLandData.protectedLandName),
      totalArea: protectedLandData.totalArea,
      uplandArea: protectedLandData.uplandArea,
      marineArea: protectedLandData.marineArea,
      marineProtectedArea: protectedLandData.marineProtectedAreaInd,
      type: protectedLandData.protectedLandTypeDescription,
      typeCode: protectedLandData.protectedLandTypeCode,
      class: protectedLandData.protectedLandClassCode,
      status: protectedLandData.protectedLandStatusCode,
      featureId: protectedLandData.featureId,
      establishedDate: protectedLandData.establishedDate
        ? moment(protectedLandData.establishedDate, "YYYY-MM-DD")
            .tz("UTC")
            .format()
        : null,
      repealedDate: null,
      url: "",
      latitude: null,
      longitude: null,
      mapZoom: null,
      sites: [...sites],
      managementAreas: [...managementAreas],
    });
  } catch (error) {
    strapi.log.error(error);
  }
};

const loadAdditionalProtectedAreaInfo = async () => {
  try {
    strapi.log.info("loading protected area supplementary information...");
    var jsonData = fs.readFileSync(
      "./data/protected-area-coordinates.json",
      "utf8"
    );
    const data = JSON.parse(jsonData);
    Promise.resolve(
      data["protectedArea"].forEach(async (p) => {
        if (p.status === "Active") {
          const protectedArea = {
            url: p.url,
            dayUsePass: p.dayUsePass,
            fogZone: p.fogZone,
          };
          if (p.latitude !== "") {
            protectedArea.latitude = p.latitude;
          }
          if (p.longitude !== "") {
            protectedArea.longitude = p.longitude;
          }
          if (p.mapZoom !== "") {
            protectedArea.mapZoom = p.mapZoom;
          }
          await strapi.services["protected-area"].update(
            { orcs: p.orcs },
            protectedArea
          );
        }
      })
    );
    strapi.log.info(
      "loading protected area supplementary information completed..."
    );
  } catch (error) {
    strapi.log.error(error);
  }
};

const loadAdditionalSiteInfo = async () => {
  try {
    strapi.log.info("loading site supplementary information...");
    var jsonData = fs.readFileSync("./data/site-coordinates.json", "utf8");
    const data = JSON.parse(jsonData);
    Promise.resolve(
      data["site"].forEach(async (s) => {
        if (s.status === "Active") {
          const site = { url: s.url };
          if (s.latitude !== "") {
            site.latitude = s.latitude;
          }
          if (s.longitude !== "") {
            site.longitude = s.longitude;
          }
          if (s.mapZoom !== "") {
            site.mapZoom = s.mapZoom;
          }
          await strapi.services["site"]
            .update({ orcsSiteNumber: s.orcs + "-" + s.orcsSiteNumber }, site)
            .catch(async () => {
              strapi.log.info("creating custom site...");
              const protectedArea = await Promise.resolve(
                strapi.query("protected-area").findOne({
                  orcs: s.orcs,
                })
              );
              await strapi.services["site"]
                .create({
                  ...site,
                  orcsSiteNumber: s.orcs + "-" + s.orcsSiteNumber,
                  siteNumber: s.orcsSiteNumber,
                  siteName: s.siteName,
                  status: s.status,
                  establishedDate: s.establishedDate
                    ? moment(s.establishedDate, "YYYY-MM-DD").tz("UTC").format()
                    : null,
                  repealedDate: s.repealedDate
                    ? moment(s.repealedDate, "YYYY-MM-DD").tz("UTC").format()
                    : null,
                  protectedArea: protectedArea,
                })
                .catch((error) => {
                  strapi.log.error("error creating custom site", error);
                });
            });
        }
      })
    );
    strapi.log.info("loading site supplementary information completed...");
  } catch (error) {
    strapi.log.error(error);
  }
};

module.exports = {
  loadParData,
  loadAdditionalParData,
};
