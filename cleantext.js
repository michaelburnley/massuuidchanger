import { promises as fs } from "fs";
import _ from "lodash";
import util from "util";
import parser from "xml2js";
import { v4 as uuidv4 } from "uuid";
import { replaceInFile } from "replace-in-file";

const MapIDsandText = async () => {
  const data = await fs.readFile("./files/handle_reference_list.xml");
  const results = await parser.parseStringPromise(data);

  const content = results.contentList.content;

  const test = {
    text: "A Noble Endeavour",
    ids: [],
  };

  const arr = _.map(content, (item) => ({
    text: item["_"],
    id: item["$"].contentuid,
  }));

  const final = [];

  _.each(arr, (item) => {
    const entry = _.find(final, (x) => x.name == item.text);

    if (!entry) {
      const new_json = {
        name: item.text,
        ids: [item.id],
      };
      final.push(new_json);
    } else {
      entry.ids.push(item.id);
    }
  });

  return final;
};

const FindCorrectUUID = async (items) => {
  const data = await fs.readFile("./files/english.xml");
  const results = await parser.parseStringPromise(data);
  const content = results.contentList.content;

  //   const arr = _.map(content, (item) => ({
  //     text: item["_"],
  //     id: item["$"].contentuid,
  //   }));

  const arr = [];

  _.each(items, (item) => {
    const element = _.find(content, (line) => line["_"] == item.name);
    arr.push({
      text: item.name,
      id: element["$"].contentuid,
    });
  });

  return arr;
};

const ChangeUUIDS = async (bad_ids, correct_ids) => {
  const all_results = [];

  for (let index = 0; index < bad_ids.length; index++) {
    const element = bad_ids[index];

    const { id } = _.find(correct_ids, (x) => x.text == element.name);

    for (let i = 0; i < element.ids.length; i++) {
      const bad_id = element.ids[i];
      const options = {
        files: "./files/BackgroundGoals.tbl",
        from: bad_id,
        to: id,
        countMatches: true,
      };

      try {
        const results = await replaceInFile(options);

        console.log(`${bad_id} -> ${id}`);
        // console.log("Replacement results:", results);

        const [r] = results;

        if (r.hasChanged) {
          const added_results = {
            ...r,
            bad_id,
            id,
          };
          all_results.push(added_results);
        }
      } catch (error) {
        console.error("Error occurred:", error);
      }
    }
  }
  fs.writeFile(
    "./output/results.txt",
    JSON.stringify(all_results),
    { flag: "a+" },
    (err) => {}
  );
};

(async () => {
  const items = await MapIDsandText();
  const correct_ids = await FindCorrectUUID(items);

  await ChangeUUIDS(items, correct_ids);
})();
