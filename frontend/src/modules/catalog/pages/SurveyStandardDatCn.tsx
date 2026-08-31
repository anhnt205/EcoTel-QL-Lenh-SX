import { CatalogPage } from "../CatalogPage";
import { surveyStandardDatCnConfig } from "../configs";
import { SeamGroupKeyBuilder } from "../std/SeamGroupKeyBuilder";

export default function SurveyStandardDatCn() {
  return (
    <CatalogPage
      config={surveyStandardDatCnConfig}
      extraActions={<SeamGroupKeyBuilder />}
    />
  );
}
