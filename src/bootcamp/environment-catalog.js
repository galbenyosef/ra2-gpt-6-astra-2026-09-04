// Existing authored environment GLBs; these are scenery, never recruitable actors.
export const environmentAssets = [
  ...['grass','ocean','plateau','ramp','tree22','tree10'].map(id=>({id,file:`../environment/${id}.glb`})),
  {id:'tree26',file:'../batch-two/tree26.glb'},
  {id:'dirt-road',file:'../batch-two/dirt-road.glb'},
  {id:'curved-road',file:'../batch-three/curved-road.glb'},
];
