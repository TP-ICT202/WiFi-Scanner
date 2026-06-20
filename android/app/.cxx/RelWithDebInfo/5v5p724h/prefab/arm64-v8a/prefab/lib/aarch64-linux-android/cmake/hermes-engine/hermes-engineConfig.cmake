if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/home/tchinda/.gradle/caches/9.3.1/transforms/562a64c13abc608fb3b9e342c000f522/transformed/hermes-android-0.79.2-release/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/tchinda/.gradle/caches/9.3.1/transforms/562a64c13abc608fb3b9e342c000f522/transformed/hermes-android-0.79.2-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

