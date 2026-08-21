// Region definitions: each region has one or more surf spots to choose
// between. Photo credit info is required by the CC BY-SA license the
// source photos are under.
const REGIONS = {
  "sunshine-coast": {
    name: "Sunshine Coast",
    spots: [
      {
        name: "Alexandra Headland",
        lat: -26.6802,
        lon: 153.1198,
        timezone: "Australia/Brisbane",
        image: "images/sunshine-coast.jpg",
        photoCredit: { author: "Kgbo", url: "https://commons.wikimedia.org/wiki/File:Alexandra_Headland_Beach_looking_north,_Queensland.jpg" }
      }
    ]
  },
  "gold-coast": {
    name: "Gold Coast",
    spots: [
      {
        name: "Surfers Paradise",
        lat: -27.9977,
        lon: 153.4310,
        timezone: "Australia/Brisbane",
        image: "images/gold-coast-surfers-paradise.jpg",
        photoCredit: { author: "Kgbo", url: "https://commons.wikimedia.org/wiki/File:Surfers_Paradise_beach,_Queensland_04.JPG" }
      },
      {
        name: "Coolangatta",
        lat: -28.1683,
        lon: 153.5390,
        timezone: "Australia/Brisbane",
        image: "images/gold-coast-coolangatta.jpg",
        photoCredit: { author: "Kgbo", url: "https://commons.wikimedia.org/wiki/File:Coolangatta_Beach,_Queensland_01.jpg" }
      },
      {
        name: "Fingal Head",
        lat: -28.2004,
        lon: 153.5661,
        timezone: "Australia/Sydney", // just south of the QLD border, in NSW
        image: "images/gold-coast-fingal-head.jpg",
        photoCredit: { author: "Kgbo", url: "https://commons.wikimedia.org/wiki/File:Shore_to_the_north_seen_from_Fingal_Head,_New_South_Wales_01.jpg" }
      }
    ]
  },
  "byron-bay": {
    name: "Byron Bay",
    spots: [
      {
        name: "The Pass",
        lat: -28.6320,
        lon: 153.6180,
        timezone: "Australia/Sydney",
        image: "images/byron-bay.jpg",
        photoCredit: { author: "Joyantonie", url: "https://commons.wikimedia.org/wiki/File:Byron_Bay_beach_with_Lighthouse_in_the_background.jpg" }
      }
    ]
  }
};
