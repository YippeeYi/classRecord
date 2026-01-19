/************************************************************
 * peopleStore.js
 * 全局人物仓库
 ************************************************************/

window.PeopleStore = {
    people: [],
    loaded: false
};

window.loadAllPeople = async function () {
    if (PeopleStore.loaded) {
        return PeopleStore.people;
    }

    const list = await loadWithCache({
        key: "people",
        expire: 24 * 60 * 60 * 1000,
        loader: async () => {
            const indexRes = await fetch("data/people/people_index.json");
            const files = await indexRes.json();

            const people = [];

            for (const f of files) {
                const res = await fetch(`data/people/${f}`);
                people.push(await res.json());
            }

            return people;
        }
    });

    PeopleStore.people = list;
    PeopleStore.loaded = true;
    return list;
};
