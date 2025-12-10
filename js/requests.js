// 获取全球发电厂数据
export async function getPowerPlantPoints() {
  return await fetch('data/globalPowerPlantData.json').then((res) => res.json());
}

// 获取全球国家数据
export async function getCountries() {
  return await fetch('data/countries.json').then((res) => res.json());
}

// 获取国家边界数据
export async function getCountryGeo(countryCode) {
  return await fetch(`https://api.resourcewatch.org/v2/geostore/admin/${countryCode}`).then((res) => res.json());
}
