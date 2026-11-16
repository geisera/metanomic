import {samFetch,SamuelError} from './server';
import {validUei,normalizeEntity} from './entity';
export async function fetchEntity(uei:unknown){
 if(!validUei(uei))throw new SamuelError('Enter a 12-character UEI using letters and numbers.',400);
 const data=await samFetch('/entity-information/v3/entities',new URLSearchParams({ueiSAM:uei,includeSections:'entityRegistration,coreData,assertions'}));
 if(!Array.isArray(data.entityData)){
  if(Number(data.totalRecords)===0)throw new SamuelError('No publicly available registered entity was found for this UEI. Check the UEI and the entity’s public-display settings.',404);
  throw new SamuelError('SAM.gov returned an unexpected entity response.');
 }
 const matches=data.entityData.map(r=>normalizeEntity(r,uei)).filter(r=>r!==null);
 if(matches.length!==1)throw new SamuelError(matches.length?'SAM.gov returned multiple registrations for this UEI. Verify the record on SAM.gov.':'No publicly available registered entity was found for this UEI. Check the UEI and the entity’s public-display settings.',matches.length?409:404);
 return matches[0];
}
