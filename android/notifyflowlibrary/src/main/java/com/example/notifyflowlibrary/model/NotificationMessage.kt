package com.example.notifyflowlibrary.model

class NotificationMessage {

    var id: String? = null
    var projectId: String? = null

    var title: String? = null
    var body: String? = null
    var type: String? = null // POPUP / BANNER
    var category: String? = null // PROMOTION / FEATURE_ANNOUNCEMENT

    var screenName: String? = null
    var active: Boolean = true

    var countries: ArrayList<String> = arrayListOf()

    var minAndroidVersion: Int = 0
    var maxAndroidVersion: Int = 999

    var maxViewsPerUser: Int = 1

    var startDate: String? = null
    var endDate: String? = null

    var variants: ArrayList<MessageVariant> = arrayListOf()

    override fun toString(): String {
        return "NotificationMessage(" +
                "id=$id, " +
                "projectId=$projectId, " +
                "title=$title, " +
                "body=$body, " +
                "type=$type, " +
                "category=$category, " +
                "screenName=$screenName, " +
                "active=$active, " +
                "countries=$countries, " +
                "minAndroidVersion=$minAndroidVersion, " +
                "maxAndroidVersion=$maxAndroidVersion, " +
                "maxViewsPerUser=$maxViewsPerUser, " +
                "startDate=$startDate, " +
                "endDate=$endDate, " +
                "variants=$variants" +
                ")"
    }
}