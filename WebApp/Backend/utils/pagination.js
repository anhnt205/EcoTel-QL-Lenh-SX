// utils/pagination.js
const paginateQuery = async (modelQuery, model, filter = {}, reqQuery = {}) => {
  const page = parseInt(reqQuery.page);
  const limit = parseInt(reqQuery.pageSize);
  const skip = (page - 1) * limit;

  let totalDocs = 0;
  let data;

  if (!isNaN(page) && !isNaN(limit)) {
    totalDocs = await model.countDocuments(filter);
    data = await modelQuery.skip(skip).limit(limit);
  } else {
    data = await modelQuery;
  }

  return {
    totalDocs,
    page: !isNaN(page) ? page : undefined,
    totalPages:
      !isNaN(page) && !isNaN(limit) ? Math.ceil(totalDocs / limit) : undefined,
    results: data.length,
    data,
  };
};
module.exports = { paginateQuery };
