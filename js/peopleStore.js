/************************************************************
 * peopleStore.js
 * 全局人物仓库
 ************************************************************/

window.PeopleStore = {
    people: [],
    loaded: false
};

window.loadAllPeople = async function ({ onProgressStep } = {}) {
    if (PeopleStore.loaded) {
        return PeopleStore.people;
    }

    const list = await loadWithCache({
        key: "people",
        expire: 24 * 60 * 60 * 1000,
        loader: async () => {
            const indexRes = await fetch("data/people/people_index.json");
            const files = await indexRes.json();


            const people = await Promise.all(
                files.map(async (f) => {
                    const res = await fetch(`data/people/${f}`);
                    const person = await res.json();

                    if (typeof onProgressStep === "function") {
                        onProgressStep();
                    }

                    return person;
                })
            );

            return people;
        }
    });

    PeopleStore.people = list;
    PeopleStore.loaded = true;
    return list;
};
