import { CatalogPage } from "../CatalogPage";
import { surveyStandardDatSxConfig } from "../configs";
import { SeamGroupKeyBuilder } from "../std/SeamGroupKeyBuilder";

export default function SurveyStandardDatSx() {
  return (
    <CatalogPage
      config={surveyStandardDatSxConfig}
      extraActions={<SeamGroupKeyBuilder />}
    />
  );
}
