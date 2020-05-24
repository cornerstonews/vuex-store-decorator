export default {
    input: "lib/vuex-store-decorator.js",
    output: {
        file: "lib/vuex-store-decorator.umd.js",
        format: "umd",
        name: "VuexStoreDecorator",
        globals: {
            vue: "Vue",
            "vue-class-component": "VueClassComponent"
        },
        exports: "named"
    },
    external: ["vue", "vue-class-component"]
};
