export const ITEMS_QUERY = `
  query Items($name: String) {
    items(name: $name) {
      id
      name
      shortName
      iconLink
      wikiLink
      avg24hPrice
      sellFor {
        vendor { name }
        price
        currency
      }
    }
  }
`;

export const TASKS_QUERY = `
  query Tasks {
    tasks {
      id
      name
      trader { name }
      map { name }
      minPlayerLevel
      kappaRequired
      taskRequirements { task { id name } }
      objectives {
        id
        type
        description
        maps { name }
      }
    }
  }
`;

export const MAPS_QUERY = `
  query Maps {
    maps {
      id
      name
      description
      enemies
      raidDuration
      bosses {
        name
        spawnChance
      }
    }
  }
`;

export const HIDEOUT_STATIONS_QUERY = `
  query HideoutStations {
    hideoutStations {
      id
      name
      levels {
        level
        itemRequirements {
          item { id name }
          count
        }
      }
    }
  }
`;

export const GOON_REPORTS_QUERY = `
  query GoonReports($gameMode: GameMode) {
    goonReports(gameMode: $gameMode, limit: 50) {
      map { id name }
      timestamp
    }
  }
`;
