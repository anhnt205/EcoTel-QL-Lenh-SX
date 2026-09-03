import { CatalogPage } from "../CatalogPage";
import { surveyStandardDatSxConfig } from "../configs";
import { SurveyStandardAddModal } from "../std/SurveyStandardAddModal";

export default function SurveyStandardDatSx() {
  return (
    <CatalogPage
      config={surveyStandardDatSxConfig}
      customAddModal={(props) => <SurveyStandardAddModal {...props} />}
    />
  );
}
