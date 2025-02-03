import { promises as fs } from "fs";
import _ from "lodash";
import util from "util";
import parser from "xml2js";
import { v4 as uuidv4 } from "uuid";
import { replaceInFile } from "replace-in-file";

let filenames = [];

const GetBaseUUIDS = async () => {
  if (!filenames.includes("BackgroundGoals.tbl"))
    throw new Error(
      "No table directory found. Place BackgroundGoals.tbl in files directory."
    );

  const data = await fs.readFile("./files/BackgroundGoals.tbl");
  const result = await parser.parseStringPromise(data);

  const uuids = [];

  let stat_objects = result.stats.stat_objects;

  _.each(stat_objects, (stat_object) => {
    _.each(stat_object.stat_object, (x) => {
      _.each(x.fields, (y) => {
        _.each(y.field, (t) => {
          if (t["$"].type == "IdTableFieldDefinition") {
            uuids.push(t["$"].value);
          }
        });
      });
    });
  });

  return uuids;
};

const GetValidUUIDs = async (filename, uuids) => {
  const arr = [];

  const data = await fs.readFile(filename);

  _.each(uuids, (uuid) => {
    if (data.includes(uuid)) arr.push(uuid);
  });

  return arr;
};

const GenerateAndReplace = async (duplicates) => {
  const all_results = [];
  for (let index = 0; index < duplicates.length; index++) {
    const new_uuid = uuidv4();
    const old_uuid = duplicates[index];

    for (let file_index = 0; file_index < filenames.length; file_index++) {
      const filename = filenames[file_index];

      const options = {
        files: filename,
        from: old_uuid,
        to: new_uuid,
        countMatches: true,
      };

      try {
        const results = await replaceInFile(options);
        console.log(`${old_uuid} -> ${new_uuid}`);
        console.log("Replacement results:", results);

        const [r] = results;

        if (r.hasChanged) {
          const added_results = {
            ...r,
            old_uuid,
            new_uuid,
          };
          all_results.push(added_results);
        }
      } catch (error) {
        console.error("Error occurred:", error);
      }
    }
  }

  fs.writeFile(
    "./output/UUIDChangeResults.txt",
    JSON.stringify(all_results),
    { flag: "a+" },
    (err) => {}
  );
};

const ClearOutputFile = async () => {
  try {
    await fs.writeFile("./output/UUIDChangeResults.txt", "");
    console.log("Output file cleared.");
  } catch (err) {
    console.log(err.message);
  }
};

(async () => {
  try {
    await ClearOutputFile();
    filenames = await fs.readdir("./files");

    const uuids = await GetBaseUUIDS();

    const duplicates = [];

    for (let i = 0; i < filenames.length; i++) {
      const arr = await GetValidUUIDs(filenames[i], uuids);
      duplicates.push(...arr);
    }

    GenerateAndReplace(duplicates);
  } catch (err) {
    console.error(err.message);
  }
})();
